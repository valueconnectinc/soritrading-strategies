/*
 * @coinsori-strategy v1
 * name: OBV Volume-Flow Trend BTC 1D v2 (faster + trail)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: v1 of the OBV volume-flow trend made money 2/3 windows and
 * BEAT buy-and-hold in the 2018-22 bull (+414% vs +271%) — a trend edge the
 * mean-reversion champion lacks. Its weakness was W3 (2022-26): it lagged the
 * big melt-up by ~125pp because the 30-day OBV lookback and 200-SMA gate kept
 * it out of the early rally. This v2 shortens the OBV lookback to 20 days to
 * react faster to new accumulation, and adds a 25% trailing stop so it rides
 * strong trends instead of selling on every brief OBV dip.
 * When it buys and sells: buys when 20-day OBV is clearly rising AND price is
 * above the 200-day average AND volume confirms; sells when OBV turns down or
 * price falls 25% from its peak while holding.
 * When it does NOT work: shorter lookback = more whipsaw in choppy sideways
 * markets; and in a slow grind it may still lag if volume stays quiet.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (!closes || !vols || closes.length < 22) return null;

  let obv = 0;
  const obvSeries = [];
  for (let k = 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < 22) return null;
  const obvNow = obvSeries[obvSeries.length - 1];
  const obvPast = obvSeries[obvSeries.length - 21]; // 20-day lookback

  const rising = obvNow > obvPast * 1.01;
  const falling = obvNow < obvPast * 0.99;

  // Track peak price while holding for the trailing stop.
  const st = ctx.state;
  if (pos > 0) {
    st.peak = st.peak == null ? price : Math.max(st.peak, price);
    // Exit on OBV down-turn OR 25% trailing stop from the running peak.
    if (falling || price <= st.peak * 0.75) {
      st.peak = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  st.peak = null;

  const avgV = ctx.avgVol(20);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (rising && price > sma200 && volOk && cd === 0) {
    ctx.state.cd = 5;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
