/*
 * @coinsori-strategy v1
 * name: SOL Hysteresis + ATR Trail No-Sizing 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The SOL champion's sizing levers (vol-scaled and fear-greed cuts)
 * may be hurting the recent 2023-2026 window, where it returned 353% vs buy-and-hold
 * 1148% — cutting exposure during a strong melt-up means missing the rally. This variant
 * removes BOTH sizing levers and goes full position on the hysteresis trend signal, to
 * test whether the sizing is the reason the strategy lags in sustained uptrends.
 * When it buys and sells: Buy full when the last closed price is above the 50-day average.
 * Sell full when price closes 1 ATR below the average, drops 3 ATRs below it, or falls
 * 3 ATRs off its running high (trailing stop).
 * When it does NOT work: With no sizing, it rides every drawdown at full size, so MDD is
 * higher in crash regimes; and in a straight-line melt-up the trailing stop can exit a
 * normal pullback that instantly recovers.
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

  if (pos === 0) {
    st.runHigh = null;
    if (long && cash > 0 && ctx.price > 0) {
      st.runHigh = px;
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  if (st.runHigh == null) st.runHigh = px;
  st.runHigh = Math.max(st.runHigh, px);
  const trailHit = px < st.runHigh - 3.0 * atr;

  if (exitBelow || crashStop || trailHit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
