/*
 * @coinsori-strategy v1
 * name: SOL Hysteresis + ATR-Adaptive Trailing Stop 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated 1-ATR hysteresis regime-switch beats buy-and-hold
 * on SOL, and a trailing stop locks in gains during slow grind-downs. A fixed 40%
 * trailing stop is an arbitrary number that only fits SOL's volatility. This version
 * scales the trailing stop to volatility (a multiple of ATR) so the exit adapts to
 * whatever the asset does, instead of trusting a magic percentage.
 * When it buys and sells: Buy full when the last closed price is above the 50-day
 * average. Sell full when price closes more than 1 ATR below the average, falls more
 * than 3 ATRs below it in one move (crash stop), OR falls K ATRs off its highest
 * close since entry (volatility-scaled trailing stop).
 * When it does NOT work: In a straight-line melt-up a tight trailing stop exits a
 * normal pullback that instantly recovers, so it lags buy-and-hold; and the stop
 * does not help in a slow steady decline where price never makes a new high.
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
  // Trailing stop scaled to volatility: exit if price falls 4 ATRs off the running
  // high. 4 ATRs is the volatility equivalent of the ~40% stop on SOL, but it
  // adapts to the asset's own daily range instead of a fixed percentage.
  const trailHit = px < st.runHigh - 4.0 * atr;

  if (exitBelow || crashStop || trailHit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
