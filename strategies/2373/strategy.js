/*
 * @coinsori-strategy v1
 * name: SOL Hysteresis Trend + Trailing Stop 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated 1-ATR hysteresis regime-switch (ride SOL above
 * its 50-day average, exit a full ATR below it) already beats buy-and-hold. Its
 * one documented weakness is a slow grind-down below the average by less than 1
 * ATR a day: price gives back profit before the exit triggers. Adding a trailing
 * stop that locks in gains as price falls off its running high fixes that weakness.
 * When it buys and sells: Buy full when the last closed price is above the 50-day
 * average. Sell full when price closes more than 1 ATR below the average, OR falls
 * a set % off its highest close since entry (trailing stop), OR drops 3 ATRs below
 * the average in one move (crash stop).
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
    st.runHigh = null; // reset when flat
    if (long && cash > 0 && ctx.price > 0) {
      st.runHigh = px; // set running high at entry
      return { side: 'buy', qty: (cash / ctx.price) * 0.98 };
    }
    return null;
  }

  // While long, update the running high to the highest closed price we've seen.
  if (st.runHigh == null) st.runHigh = px;
  st.runHigh = Math.max(st.runHigh, px);
  // Trailing stop: exit if price falls 40% off the running high. 40% is loose
  // enough that normal SOL bull pullbacks (20-30%) don't whipsaw us out, but it
  // still protects profit from the worst grind-downs and crash reversals.
  const trailHit = px < st.runHigh * (1 - 0.40);

  if (exitBelow || crashStop || trailHit) {
    return { side: 'sell', qty: pos };
  }
  return null;
}
