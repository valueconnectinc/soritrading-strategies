/*
 * @coinsori-strategy v1
 * name: MACD with RSI Filter
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000

 * Why this strategy: This strategy combines MACD and RSI indicators to reduce false signals. It uses MACD for trend identification and RSI as a filter to confirm overbought/oversold conditions. The strategy enters a long position when the MACD line crosses above the signal line, while the RSI is below 50 (indicating an oversold condition), and exits when the MACD line crosses below the signal line or RSI exceeds 50.
 * When it buys and sells: It buys when MACD crosses above signal and RSI < 50, sell when MACD crosses below signal or RSI > 50. This combination aims to filter out some false signals that could occur with a single indicator.
 * When it does NOT work: The strategy might not perform well in highly volatile markets where both indicators frequently send conflicting signals. It also assumes that MACD and RSI work well together, which may not always be true, especially in trending or ranging markets.
 */

function onUpdate(ctx) {
  // Get MACD values
  const macd = ctx.macd(12, 26, 9);
  
  // If we don't have MACD data yet, return null to wait
  if (macd == null || macd.macd == null || macd.signal == null) return null;

  // Get RSI value
  const rsi = ctx.rsi(14);
  
  // If we don't have RSI data yet, return null to wait
  if (rsi == null) return null;

  // Entry and exit conditions based on MACD and RSI
  
  // Buy condition: MACD line crosses above signal line AND RSI is below 50 (oversold)
  if (ctx.position === 0 && macd.macd > macd.signal && rsi < 50) {
    return { 
      side: 'buy', 
      qty: ctx.cash / ctx.price * 0.99 // Use 99% of available cash
    };
  }
  
  // Sell condition: MACD line crosses below signal line OR RSI is above 50 (overbought)
  if (ctx.position === 0 && macd.macd < macd.signal || rsi > 50) {
    return { 
      side: 'sell', 
      qty: ctx.cash / ctx.price * 0.99 // Use 99% of available cash
    };
  }
  
  // Close position if it's profitable or if condition no longer holds
  if (ctx.position !== 0) {
    const profit = ctx.position > 0 ? 
      (macd.macd < macd.signal || rsi > 50) : // For long positions, exit on MACD cross below signal OR RSI above 50
      (macd.macd > macd.signal || rsi < 50); // For short positions, exit on MACD cross above signal OR RSI below 50
    
    if (profit && Math.abs(ctx.position) > 0) {
      return { 
        side: ctx.position > 0 ? 'sell' : 'buy',
        qty: Math.abs(ctx.position)
      };
    }
  }

  // No action needed
  return null;
}
