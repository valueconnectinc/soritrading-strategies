/*
 * @coinsori-strategy v1
 * name: ETH Plain Trend Fixed-Size 4H (baseline)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Baseline comparison for the volatility-scaled trend. Same
 *   EMA50/200 trend entry and exit, but with a fixed full-size position instead of
 *   ATR-scaled sizing, to isolate whether volatility scaling helps or hurts.
 * When it buys and sells: Buy full size when EMA50 crosses above EMA200, sell when
 *   it crosses below.
 * When it does NOT work: Choppy sideways markets whipsaw.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(50, 1);
  const slow = ctx.ema(200, 1);
  if (fast == null || slow == null) return null;
  const pos = ctx.position;
  if (pos > 0) {
    if (fast < slow) return { side: 'sell', qty: pos };
    return null;
  }
  if (fast > slow) return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  return null;
}
