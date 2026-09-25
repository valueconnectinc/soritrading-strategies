/*
 * @coinsori-strategy v1
 * name: SOL 4H EMA50/200 Trend
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Generalization test of the EMA50/200 long-trend that already beat
 *   buy-and-hold on BTC 4h (all 3 windows) and ETH 4h. If it also holds on SOL 4h — a
 *   higher-volatility asset — the edge is robust and symbol-agnostic, not a BTC/ETH fit.
 * When it buys and sells: Buy when the 50-period EMA crosses above the 200-period EMA.
 *   Sell when it crosses back below.
 * When it does NOT work: Choppy sideways markets whipsaw in and out. Long-only, so it
 *   misses short-side gains in bear markets.
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
