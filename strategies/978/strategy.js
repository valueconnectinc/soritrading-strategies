/*
 * @coinsori-strategy v1
 * name: MACD Crossover Trend Following Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the MACD (Moving Average Convergence Divergence) to identify trend changes. It enters a long position when the MACD line crosses above the signal line and exits when it crosses below. The approach is to follow strong trends rather than mean-revert during periods of consolidation.
 * When it buys and sells: It buys when the MACD line crosses above the signal line (bullish crossover) and sells when the MACD line crosses below the signal line (bearish crossover).
 * When it does NOT work: This strategy may underperform in ranging markets where there are frequent crossovers but no clear trend, or if the parameters of the MACD are not suited to the current market conditions.
 */
function onUpdate(ctx) {
  // Get MACD indicators
  const macd = ctx.macd(12, 26, 9, 0);
  
  // Check if required data is available
  if (macd == null || macd.macd == null || macd.signal == null) return null;

  // Buy condition: MACD line crosses above signal line
  const isBullishCrossover = macd.macd > macd.signal;
  
  // Sell/exit condition: MACD line crosses below signal line
  const isBearishCrossover = macd.macd < macd.signal;
  
  // Position size
  const positionSize = ctx.cash / ctx.price * 0.99; // Use 99% of cash

  // Buy condition - Enter long only if not already in a position
  if (isBullishCrossover && ctx.position <= 0) {
    return { side: 'buy', qty: positionSize };
  }

  // Sell condition - Close long position
  if (isBearishCrossover && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // Do nothing
  return null;
}
