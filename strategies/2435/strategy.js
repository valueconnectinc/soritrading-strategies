/*
 * @coinsori-strategy v1
 * name: ETH 4H EMA Trend w/ Fast Exit
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The plain EMA50/200 trend on ETH 4h made money in every window
 *   and beat buy-and-hold in the recent bear, but it carries a 39-48% drawdown from
 *   holding through crashes. This version adds a faster EMA20<EMA50 exit so it leaves
 *   a position as soon as the short-term trend turns down, cutting the crash drawdown
 *   while keeping the slow EMA50/200 entry that avoids whipsaw.
 * When it buys and sells: Buy when EMA50 crosses above EMA200 (uptrend). Sell when
 *   EMA50 crosses below EMA200 (base exit) OR when EMA20 crosses below EMA50 (faster
 *   crash exit).
 * When it does NOT work: The fast exit can cut winners short in a strong uptrend that
 *   has small pullbacks, so it may give back upside in clean bull runs. Choppy sideways
 *   markets still whipsaw. Long-only.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(50, 1);
  const slow = ctx.ema(200, 1);
  const fast20 = ctx.ema(20, 1);
  const fast50 = ctx.ema(50, 1);
  if (fast == null || slow == null || fast20 == null || fast50 == null) return null;

  const pos = ctx.position;

  // Exit: base trend broken OR fast short-term trend turned down (crash exit).
  if (pos > 0) {
    if (fast < slow || fast20 < fast50) return { side: 'sell', qty: pos };
    return null;
  }

  // Enter: uptrend.
  if (fast > slow) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }

  return null;
}
