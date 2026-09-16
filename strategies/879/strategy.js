/*
 * @coinsori-strategy v1
 * name: Pivot Point Reversal Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses pivot points combined with moving averages to identify potential reversal zones. It enters a long position when price breaks above the pivot point and closes when it drops below a moving average.
 * When it buys and sells: It buys when price crosses above the pivot point and sells when price falls below a 20-period EMA.
 * When it does NOT work: This strategy fails in strong trending markets or during periods of low volatility, where breakout signals are unreliable or where the price does not respect pivot points.
 */

function onUpdate(ctx) {
  // Get pivot point components
  const high = ctx.high(1);
  const low = ctx.low(1);
  const close = ctx.closes[1]; // previous close

  if (high === null || low === null || close === null) return null;

  // Calculate Pivot Point
  const pivotPoint = (high + low + close) / 3;

  // Calculate support and resistance levels
  const r1 = 2 * pivotPoint - low;
  const s1 = 2 * pivotPoint - high;

  // Use EMA as a filter for trend confirmation
  const emaLength = 20;
  const emaValue = ctx.ema(emaLength, 1);
  const prevEmaValue = ctx.ema(emaLength, 2);

  if (emaValue === null || prevEmaValue === null) return null;

  // Buy condition: price breaks above pivot point and price is above EMA
  if (ctx.price > pivotPoint && ctx.price > emaValue) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: price falls below EMA
  if (ctx.price < emaValue) {
    return { side: 'sell', qty: ctx.position };
  }

  // Default behavior: do nothing
  return null;
}
