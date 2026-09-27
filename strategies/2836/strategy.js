/*
 * @coinsori-strategy v1
 * name: OBV Trend + RSI Entry Filter BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV champion enters whenever OBV rises above the 100-day
 * average with volume, which lets it buy right at local tops (extended RSI), and
 * those top-buys are a big source of the family's high drawdown. This variant
 * keeps the champion's exact signals but SKIPS entries when RSI is already
 * overbought (>70) — a pure entry-timing filter, unlike all the failed exit
 * levers. Most strong trends start from a neutral/oversold base, so skipping
 * overbought entries should cut whipsaw without missing the bulk of the move.
 * When it buys and sells: buys on rising 30-day OBV above the 100-day average
 * with volume AND RSI(14) below 70; exits fully when OBV turns down.
 * When it does NOT work: in a relentless melt-up where OBV stays rising for
 * months with RSI pinned above 70, it can miss a large portion of the trend.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma100 == null || rsi == null) return null;

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

  // Entry filter: skip when RSI(14) already overbought (>70) — avoids buying tops.
  if (rising && price > sma100 && volOk && rsi < 70 && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
