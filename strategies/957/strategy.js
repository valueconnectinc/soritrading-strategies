/*
 * @coinsori-strategy v1
 * name: MACD Trend Following Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses the MACD indicator to identify trends and generate buy/sell signals.
 * When the MACD line crosses above the signal line, it's a buy signal.
 * When the MACD line crosses below the signal line, it's a sell signal.
 * It aims for trend-following with filtering to reduce false signals.
 */

function onUpdate(ctx) {
  // Get the MACD values
  const macd = ctx.macd(12, 26, 9);           // MACD (12, 26, 9)
  
  // Check if we have enough data to calculate MACD
  if (macd == null || macd.macd == null || macd.signal == null) return null;
  
  // Check if we are currently holding a position
  const hasPosition = ctx.position > 0;
  
  // Buy condition: MACD line crosses above signal line
  if (!hasPosition && macd.macd > macd.signal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: MACD line crosses below signal line
  if (hasPosition && macd.macd < macd.signal) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // Do nothing if conditions are not met
  return null;
}
