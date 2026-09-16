/*
 * @coinsori-strategy v1
 * name: Simple Moving Average Crossover
 * ex: binanceusdm
 * syms: ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This is a classic mean reversion strategy based on moving average crossovers. It uses two moving averages to identify trend changes and enters trades when they cross.
 * When it buys and sells: It goes long when the short-term moving average crosses above the long-term moving average. It exits the position when the short-term moving average crosses below the long-term moving average.
 * When it does NOT work: This strategy can suffer from lag in trend detection, especially in ranging or low-volatility markets. It may also generate false signals during market consolidation periods.
 */

function onUpdate(ctx) {
  // Calculate moving averages
  const fastSma = ctx.sma(10);   // Short-term SMA
  const slowSma = ctx.sma(30);   // Long-term SMA

  // Check if enough data is available
  if (fastSma == null || slowSma == null) return null;

  // Buy when fast SMA crosses above slow SMA (bullish crossover)
  if (fastSma > slowSma && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell when fast SMA crosses below slow SMA (bearish crossover)
  if (fastSma < slowSma && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
