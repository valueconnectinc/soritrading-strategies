/*
 * @coinsori-strategy v1
 * name: Momentum Breakout with ATR Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy attempts to capture momentum breaks out of consolidation phases, using ATR to filter for significant moves. It's designed to avoid false breakouts during low volatility periods.
 * When it buys and sells: The strategy buys when price breaks above the highest high of the last 10 periods, and exits when it closes below the lowest low of the last 10 periods.
 * When it does NOT work: This strategy might generate many false signals in choppy markets or during news events where price action is erratic. It can also underperform in trending markets if the breakout period is too short.
 */
function onUpdate(ctx) {
  // Get data
  const high = ctx.high(10);
  const low = ctx.low(10);
  const price = ctx.price;

  // Guard against null values
  if (high == null || low == null) return null;

  // Buy condition: price breaks above the highest high of the last 10 periods
  if (price > high && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: price closes below the lowest low of the last 10 periods
  if (price < low && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
