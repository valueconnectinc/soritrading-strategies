/*
 * @coinsori-strategy v1
 * name: Trend Following with Moving Average Crossover
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the crossover of two moving averages (SMA) to identify trend changes.
 * When a short-term SMA crosses above a long-term SMA, it signals a bullish trend, and vice versa.
 * When a trend is established, we enter a position in that direction.
 *
 * When it buys and sells: It buys when the 10-period SMA crosses above the 50-period SMA,
 * and sells when the 10-period SMA crosses below the 50-period SMA.
 *
 * When it does NOT work: This strategy may underperform during sideways markets or in volatile conditions
 * where frequent crossovers occur without clear trend direction.
 */

function onUpdate(ctx) {
  // Get indicators with ago parameter
  const shortSMA = ctx.sma(10, 0);
  const longSMA = ctx.sma(50, 0);
  const prevShortSMA = ctx.sma(10, 1);
  const prevLongSMA = ctx.sma(50, 1);

  // Need at least 2 bars for crossover
  if (shortSMA == null || longSMA == null || prevShortSMA == null || prevLongSMA == null) {
    return null;
  }

  // Check for crossover: short SMA crossing above long SMA (bullish signal)
  if (prevShortSMA <= prevLongSMA && shortSMA > longSMA) {
    // Buy with 99% of available cash
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Check for crossover: short SMA crossing below long SMA (bearish signal)
  if (prevShortSMA >= prevLongSMA && shortSMA < longSMA) {
    // Sell all position
    return { side: 'sell', qty: ctx.position };
  }
  
  // Do nothing
  return null;
}
