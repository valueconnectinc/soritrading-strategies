/*
 * @coinsori-strategy v1
 * name: SOL Hysteresis + ATR-Adaptive Stop + Vol-Sized 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated 1-ATR hysteresis regime-switch beats buy-and-hold
 * on SOL, and the ATR-adaptive trailing stop locks in gains. But going all-in on
 * every signal produced deep drawdowns (up to 76%). This version scales position
 * size down when volatility is high relative to its own history, so we risk less in
 * choppy/risky regimes and more when the market is calm.
 * When it buys and sells: Buy when the last closed price is above the 50-day average,
 * sized by how calm volatility is. Sell when price closes more than 1 ATR below the
 * average, falls more than 3 ATRs in one move, or falls 4 ATRs off its running high.
 * When it does NOT work: In a straight-line melt-up the volatility scaling keeps some
 * cash idle so it lags a fully-invested buy-and-hold; and no sizing rule fixes a slow
 * steady decline where price never makes a new high.
 */
function onUpdate(ctx) {
  const closes = ctx.closes;
  if (closes == null || closes.length < 55) return null;
  const px = closes[closes.length - 2]; // last CLOSED bar
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  const pos = ctx.position;
  const cash = ctx.cash;
  const st = ctx.state;
  if (px == null || sma50 == null || atr == null || px <= 0) return null;

  const long = px > sma50;
  const exitBelow = px < sma50 - 1.0 * atr; // hysteresis: ignore small chop
  const crashStop = px < sma50 - 3.0 * atr;

  // Volatility-scaled sizing: normalized vol = ATR as a fraction of price. We average
  // that ratio over the last 50 bars as the "normal" level, then compare today's ratio
  // to it. When today is more volatile than normal we cut exposure; the multiplier is
  // clamped to [0.3, 1] so we never go fully flat or over 100% invested.
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
  // Trailing stop scaled to volatility: exit if price falls 4 ATRs off the running high.
  const trailHit = px < st.runHigh - 4.0 * atr;

  if (exitBelow || crashStop || trailHit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
