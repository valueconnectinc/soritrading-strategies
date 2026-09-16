/*
 * @coinsori-strategy v1
 * name: Simple Moving Average Crossover
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses a simple moving average crossover to identify trend changes. It is straightforward, easy to understand, and suitable for volatile markets.
 * When it buys and sells: It buys when the short-term SMA crosses above the long-term SMA and sells when the short-term SMA crosses below the long-term SMA.
 * When it does NOT work: This strategy may not perform well in ranging markets where there is no clear trend, leading to frequent false signals.
 */

function onUpdate(ctx) {
  // Calculate SMAs
  const smaFast = ctx.sma(10); // 10-period SMA
  const smaSlow = ctx.sma(30); // 30-period SMA

  // Wait for both SMAs to be calculated
  if (smaFast == null || smaSlow == null) return null;

  // Buy when fast SMA crosses above slow SMA
  if (smaFast > smaSlow && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell when fast SMA crosses below slow SMA and we have an open position
  if (smaFast < smaSlow && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action needed
  return null;
}
