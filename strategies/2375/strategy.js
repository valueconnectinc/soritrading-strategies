/*
 * @coinsori-strategy v1
 * name: SOL Hysteresis + ATR-Adaptive Stop + Vol-Sized 1D (baseline)
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Baseline comparison — the validated hysteresis regime-switch with
 * volatility-scaled entry sizing but WITHOUT the fear & greed filter, to isolate the
 * effect of the fear filter on drawdown and returns.
 * When it buys and sells: Buy above the 50-day average, sized by volatility. Sell on
 * 1-ATR hysteresis break, 3-ATR crash, or 4-ATR trailing stop.
 * When it does NOT work: Straight-line melt-ups lag buy-and-hold; slow declines lose.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2];
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  const st = ctx.state;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr;
  const crashStop = px < sma50 - 3.0 * atr;

  let ratioSum = 0, ratioCount = 0;
  for (let k = 1; k <= 50; k++) {
    const c = closes[closes.length - 1 - k];
    const a = ctx.atr(14, k);
    if (c != null && a != null && c > 0) { ratioSum += a / c; ratioCount++; }
  }
  let sizeMult = 1;
  if (ratioCount >= 20) {
    const normRatio = ratioSum / ratioCount;
    const currentRatio = atr / px;
    sizeMult = Math.max(0.3, Math.min(1, normRatio / currentRatio));
  }

  if (pos === 0) {
    st.runHigh = null;
    if (long && cash > 0 && ctx.price > 0) {
      st.runHigh = px;
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 * sizeMult };
    }
    return null;
  }

  if (st.runHigh == null) st.runHigh = px;
  st.runHigh = Math.max(st.runHigh, px);
  const trailHit = px < st.runHigh - 4.0 * atr;

  if (exitBelow || crashStop || trailHit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
