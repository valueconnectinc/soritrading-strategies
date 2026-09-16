/*
 * @coinsori-strategy v1
 * name: Simple RSI Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000

 * Why this strategy: This is a simple RSI-based strategy that buys when the RSI falls below 30 (oversold) and sells when it rises above 70 (overbought). It's designed to capture short-term price movements in a trending market.
 * When it buys and sells: The strategy buys when RSI is below 30, indicating an oversold condition, and sells when RSI is above 70, signaling an overbought condition. It uses a simple take-profit and stop-loss mechanism to manage risk.
 * When it does NOT work: This strategy may not work during strong trending markets where RSI might remain in the oversold or overbought zones for extended periods, leading to false signals. Additionally, in ranging markets, RSI can give frequent buy/sell signals that may not result in profitable trades.
 */

function onUpdate(ctx) {
  // Get the RSI indicator
  const rsi = ctx.rsi(14);
  
  // If we don't have RSI data yet, return null to wait
  if (rsi == null) return null;

  // Define RSI thresholds
  const oversold = 30;
  const overbought = 70;
  
  // Entry and exit conditions based on RSI values
  
  // Buy condition: RSI crosses below oversold threshold
  if (ctx.position === 0 && rsi < oversold) {
    return { 
      side: 'buy', 
      qty: ctx.cash / ctx.price * 0.99 // Use 99% of available cash
    };
  }
  
  // Sell condition: RSI crosses above overbought threshold
  if (ctx.position === 0 && rsi > overbought) {
    return { 
      side: 'sell', 
      qty: ctx.cash / ctx.price * 0.99 // Use 99% of available cash
    };
  }
  
  // Close position if it's profitable (e.g., RSI crosses back toward the middle)
  if (ctx.position !== 0) {
    // Example take-profit and stop-loss conditions based on RSI crossover
    if (ctx.position > 0 && rsi > 50) { // Take profit for long
      return { 
        side: 'sell',
        qty: Math.abs(ctx.position)
      };
    }
    
    if (ctx.position < 0 && rsi < 50) { // Take profit for short  
      return { 
        side: 'buy',
        qty: Math.abs(ctx.position)
      };
    }
  }

  // No action needed
  return null;
}
