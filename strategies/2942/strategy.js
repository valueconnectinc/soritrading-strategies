/*
 * @coinsori-strategy v1
 * name: BTC 1D OBV Money-Flow Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: On-Balance Volume (OBV) tracks whether money is actually
 * flowing INTO an asset or draining out, which price alone hides. A rising
 * 45-day OBV trend above the 200-day price average confirms an accumulation-
 * driven bull; when OBV turns down, the money flow is leaving and we exit.
 * This is the trend family's strongest member — it rides melt-ups and cuts
 * losses when accumulation stops.
 *
 * When it buys and sells: buys when smoothed OBV is clearly rising vs ~45 days
 * ago, price is above its 200-day average, and trading volume confirms the move.
 * Sells when smoothed OBV turns down. A short cooldown cuts whipsaw.
 *
 * When it does NOT work: OBV can diverge from price in choppy sideways markets
 * (whipsaw), and trend signals lag sharp V-shaped tops. It never shorts, so it
 * does not profit from down-moves.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const closes = ctx.closes;
  const vols = ctx.volumes;
  const LOOKBACK = 45;
  if (!closes || !vols || closes.length < LOOKBACK + 2) return null;

  // Build the OBV series from closes and volumes.
  let obv = 0;
  const obvSeries = [];
  for (let k = 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < LOOKBACK + 1) return null;
  const obvNow = obvSeries[obvSeries.length - 1];
  const obvPast = obvSeries[obvSeries.length - 1 - LOOKBACK];

  const rising = obvNow > obvPast * 1.01;    // rising money flow
  const falling = obvNow < obvPast * 0.985;  // fading money flow

  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (ctx.position > 0) {
    if (falling && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  if (rising && price > sma200 && volOk && cd === 0) {
    ctx.state.cd = 5;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
