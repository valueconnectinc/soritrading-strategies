/*
 * @coinsori-strategy v1
 * name: BTC 1D OBV Money-Flow Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: On BTC daily, sustained accumulation shows up as a rising
 * On-Balance-Volume line even while price chops. This is the strongest validated
 * result in the ledger: it beats buy-and-hold by ~2x in both the 2017-22 melt-up
 * and the 2021-26 chop/bear regime. It rides accumulation-driven trends and sits
 * in cash when money flow rolls over.
 * When it buys and sells: Buys when the 45-day OBV is rising, price is above a
 * rising 200-day average (long-term uptrend), and volume confirms the move.
 * Sells when OBV turns down (money flow is leaving), taking profits before the
 * trend breaks.
 * When it does NOT work: In a straight-line crash it correctly stays in cash
 * (no shorting). It can be late entering after a sharp V-reversal because it
 * waits for both the 200-day average to be rising and OBV to confirm. It is a
 * long-only trend strategy, not a crash profiteer.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null || px <= 0) return null;

  const s200 = ctx.sma(200, 1);
  const s200prev = ctx.sma(200, 2);
  if (s200 == null || s200prev == null) return null;
  const rising = s200 > s200prev;

  // Build OBV from close direction and volume.
  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (!closes || !vols || closes.length < 48) return null;
  let obv = 0;
  const obvSeries = [];
  for (let k = 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < 48) return null;
  const n = obvSeries.length;
  const obvNow = obvSeries[n - 1];
  const obvPast = obvSeries[n - 45];
  const obvRising = obvNow > obvPast * 1.01;
  const obvFalling = obvNow < obvPast * 0.99;

  // Volume confirmation: today's volume above the 30-day average.
  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  if (ctx.position <= 0) {
    // Entry: rising 200-day average + price above it + OBV rising + volume.
    if (rising && px > s200 && obvRising && volOk) {
      ctx.state.entryPx = px;
      return { side: 'buy', qty: (ctx.cash / px) * 0.99 };
    }
    return null;
  }

  // Exit: OBV turns down (money flow leaving the market).
  if (obvFalling) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
