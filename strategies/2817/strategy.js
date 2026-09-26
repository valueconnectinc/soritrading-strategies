/*
 * @coinsori-strategy v1
 * name: OBV Volume-Flow Trend BTC 1D v3 (relaxed bull gate)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: v1 of the OBV trend (30-day lookback, OBV-falling exit)
 * made money 2/3 and BEAT buy-and-hold in 2018-22 (+414% vs +271%). Its only
 * weakness was W3 (2022-26): it lagged the melt-up by ~125pp because the
 * strict price>200-SMA gate kept it out of the early rally from a low base.
 * This v3 keeps the proven v1 core (30-day OBV lookback, OBV-falling exit) but
 * RELAXES the bull gate: it may enter when price is within 5% below the 200-day
 * average if OBV is strongly rising, so it can catch the start of a new rally
 * without fully abandoning the bear filter.
 * When it buys and sells: buys when 30-day OBV is clearly rising AND price is
 * above 95% of the 200-day average AND volume confirms; sells when OBV turns
 * down.
 * When it does NOT work: relaxing the gate lets in some false starts in choppy
 * markets, and it still lags the sharpest V-shaped melt-ups.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (!closes || !vols || closes.length < 32) return null;

  let obv = 0;
  const obvSeries = [];
  for (let k = 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < 32) return null;
  const obvNow = obvSeries[obvSeries.length - 1];
  const obvPast = obvSeries[obvSeries.length - 31];

  const rising = obvNow > obvPast * 1.01;
  const falling = obvNow < obvPast * 0.99;

  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    if (falling && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  // Relaxed bull gate: allow entry within 5% below the 200-SMA (catch early rally).
  if (rising && price > sma200 * 0.95 && volOk && cd === 0) {
    ctx.state.cd = 5;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
