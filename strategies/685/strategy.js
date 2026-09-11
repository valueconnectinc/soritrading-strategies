/*
 * @coinsori-strategy v1
 * name: Moving Average Crossover Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the crossover of two moving averages to identify trend changes. It is a simple yet effective method for capturing momentum shifts in price movements.
 * When it buys and sells: The strategy buys when the short-term moving average crosses above the long-term moving average, and sells when the short-term moving average crosses below the long-term moving average.
 * When it does NOT work: This strategy may fail in ranging markets where there is no clear trend, leading to false signals and potential losses.
 */
function onUpdate(ctx) {
  // Define the moving average periods
  const fastLength = 10;
  const slowLength = 30;

  // Calculate the fast and slow moving averages
  const fastMA = ctx.sma(fastLength);
  const slowMA = ctx.sma(slowLength);

  // Guard against null values
  if (fastMA == null || slowMA == null) return null;

  // Check for crossover conditions
  if (ctx.i < 1) return null; // Ensure we have at least one previous bar

  const prevFastMA = ctx.sma(fastLength, 1);
  const prevSlowMA = ctx.sma(slowLength, 1);

  if (prevFastMA == null || prevSlowMA == null) return null;

  // Buy condition: fast MA crosses above slow MA
  if (prevFastMA <= prevSlowMA && fastMA > slowMA) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: fast MA crosses below slow MA
  if (prevFastMA >= prevSlowMA && fastMA < slowMA) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action
  return null;
}
