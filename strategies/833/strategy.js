/*
 * @coinsori-strategy v1
 * name: MACD Crossover with Volume Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the MACD crossover indicator to identify trend changes, with a volume filter to confirm strength of the move. It aims to capture significant price movements early in the trend.
 * When it buys and sells: Buys when the MACD line crosses above the signal line and volume is above average, and sells when the opposite occurs.
 * When it does NOT work: This strategy may fail during ranging markets or periods of low volatility where the MACD signals are unreliable, and when volume does not confirm the trend change.
 */

function onUpdate(ctx) {
  // Get MACD values (12, 26, 9)
  const macd = ctx.macd(12, 26, 9, 0);  // Current bar
  const macd_prev = ctx.macd(12, 26, 9, 1);  // Previous bar
  
  // Get volume values
  const currentVol = ctx.vol;
  const avgVol = ctx.avgVol(10);  // Average volume over last 10 bars
  
  // Check if we have enough data to proceed
  if (macd === null || macd_prev === null) return null;
  
  // Buy condition: MACD crosses above signal line and volume is above average
  if (macd_prev.macd <= macd_prev.signal && 
      macd.macd > macd.signal && 
      currentVol > avgVol) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: MACD crosses below signal line and volume is above average
  if (macd_prev.macd >= macd_prev.signal && 
      macd.macd < macd.signal && 
      currentVol > avgVol) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action
  return null;
}
