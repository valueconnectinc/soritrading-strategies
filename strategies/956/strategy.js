/*
 * @coinsori-strategy v1
 * name: Simple Moving Average Crossover Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses a simple crossover of two moving averages to generate buy and sell signals. 
 * When the short-term moving average crosses above the long-term, it's a buy signal; when it crosses below, it's a sell signal.
 * It's designed for stability and simplicity, avoiding overfitting and excessive trading.
 */

function onUpdate(ctx) {
  // Get the moving averages
  const shortMA = ctx.sma(10);      // 10-period simple moving average
  const longMA = ctx.sma(20);       // 20-period simple moving average
  
  // Check if we have enough data to calculate the moving averages
  if (shortMA == null || longMA == null) return null;
  
  // Check if we are currently holding a position
  const hasPosition = ctx.position > 0;
  
  // Buy condition: short MA crosses above long MA
  if (!hasPosition && shortMA > longMA) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: short MA crosses below long MA
  if (hasPosition && shortMA < longMA) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // Do nothing if conditions are not met
  return null;
}
