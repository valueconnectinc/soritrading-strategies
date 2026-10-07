/*
 * @coinsori-strategy v1
 * name: BTC OBV Trend + Slope Regime 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Volume-flow (OBV) tells us whether money is accumulating
 * or distributing, and the SLOPE of the 200-day average tells us whether the
 * long-term regime is up or down. Buying only when BOTH agree filters out the
 * choppy sideways periods that cause whipsaw and drawdown.
 * When it buys and sells: Buys when the 30-day OBV trend is rising AND the
 * 200-day SMA is rising (this month's average above last month's). Sells when
 * OBV turns down OR the 200-day slope flattens/fails. Cooldown reduces churn.
 * When it does NOT work: In a long flat drift the 200-day slope is ~zero, so
 * it sits in cash and misses the early part of a new uptrend. It also lags
 * sharp V-shaped melt-ups where volume spikes before the 30-day trend catches
 * up.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // 200-day regime: SMA now vs 21 bars ago (~1 month) -> slope direction.
  const smaNow = ctx.sma(200, 1);
  const smaPrev = ctx.sma(200, 22);
  if (smaNow == null || smaPrev == null) return null;
  const slopeUp = smaNow > smaPrev * 1.001; // 0.1% buffer against noise

  // Build OBV from volume and close direction.
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

  // Hysteresis 1.0% to cut whipsaw on flat OBV (learned from the OBV champion).
  const rising = obvNow > obvPast * 1.01;
  const falling = obvNow < obvPast * 0.99;

  // Cooldown: after a flip, wait 8 bars before flipping again.
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    if ((falling || !slopeUp) && cd === 0) {
      ctx.state.cd = 8;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  if (rising && slopeUp && cd === 0) {
    ctx.state.cd = 8;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
