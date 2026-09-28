/*
 * @coinsori-strategy v1
 * name: BTC 1D OBV Trend Fed-Gated 45d
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Volume flow (OBV) tracks whether money is actually
 * accumulating into BTC or draining out, which price alone hides. A rising
 * 45-day OBV trend above the 200-day average confirms an accumulation-driven
 * bull. The Fed funds rate is the macro risk switch: when the Fed is hiking
 * or holding very high rates, risk assets de-rate and BTC dips get sold, so
 * we sit in cash instead of buying the trend.
 *
 * When it buys and sells: buys when smoothed OBV is clearly rising vs ~45
 * days earlier, price is above its 200-day average, volume confirms, AND the
 * Fed is not in a tight-money regime. Sells when smoothed OBV turns down.
 * Hysteresis + cooldown cut whipsaw.
 *
 * When it does NOT work: OBV can diverge from price in choppy sideways
 * markets (whipsaw), and trend signals lag sharp V-shaped melt-ups. If the
 * Fed data feed is unavailable the gate is skipped and the strategy runs on
 * pure OBV, which is still defensive but loses the macro protection.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (!closes || !vols || closes.length < 47) return null;

  let obv = 0;
  const obvSeries = [];
  for (let k = 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < 47) return null;
  const obvNow = obvSeries[obvSeries.length - 1];
  const obvPast = obvSeries[obvSeries.length - 46];

  const rising = obvNow > obvPast * 1.01;
  const falling = obvNow < obvPast * 0.99;

  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  // Fed gate: only buy when the Fed is NOT in a tight-money regime. Fed funds
  // above 3% = restrictive policy = risk-off for crypto, skip entries.
  const fed = ctx.data('fed');
  let fedOk = true;
  if (fed != null && Number.isFinite(fed)) fedOk = fed < 3.0;

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
  if (rising && price > sma200 && volOk && fedOk && cd === 0) {
    ctx.state.cd = 5;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
