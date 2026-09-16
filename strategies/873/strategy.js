/*
 * @coinsori-strategy v1
 * name: Multi-Asset Mean Reversion with Macro Filter
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT SOLUSDT
 * interval: 1h
 * cash: 10000
 *
 * This strategy combines mean reversion signals across multiple assets with a macro filter.
 * It uses the fear and greed index to determine market sentiment and only enters trades when
 * the market is in neutral or greedy phases, avoiding extremes where mean reversion is less effective.
 * The strategy goes long on assets that are below their 20-period moving average and short
 * those above it, with position sizing based on volatility (ATR).
 *
 * When it buys: When market sentiment is neutral/greedy AND price is below 20-period MA
 * When it sells: When market sentiment is neutral/greedy AND price is above 20-period MA
 * When it does NOT work: During strong trending periods where mean reversion fails, or during extreme fear/greed periods where the filter becomes too restrictive
 */
function onUpdate(ctx) {
  // Check if we have enough data for all indicators
  const ma = ctx.sma(20);
  const atr = ctx.atr(14);
  const fg = ctx.data('fear_greed'); // Get fear-greed index value from external dataset
  
  if (ma == null || atr == null || fg == null) return null;
  
  // If fear-greed index is too extreme, do not trade (less than 30 or greater than 70)
  // This filters out very fearful (0-30) and very greedy (70-100) periods where mean reversion fails
  if (fg < 30 || fg > 70) return null;
  
  // Calculate position size based on ATR - higher volatility means smaller position
  const positionSize = ctx.cash / (ctx.price * atr * 2); // Use 2x ATR for risk control
  
  // Initialize order array
  const orders = [];
  
  // Loop through all symbols in the strategy
  for (let i = 0; i < ctx.syms.length; i++) {
    const sym = ctx.syms[i];
    
    // Switch to this symbol context
    ctx.sym = sym;
    
    // Read current price and indicators using the current symbol
    const price = ctx.price;
    const sma20 = ctx.sma(20);
    
    if (sma20 == null) continue;  // Skip if not enough data
    
    // Entry rules:
    // Go long if price is below MA and we are in neutral/greedy market
    // Go short if price is above MA and we are in neutral/greedy market
    
    if (price < sma20) {
      // Long signal - buy with calculated position size
      orders.push({
        side: 'buy',
        qty: positionSize * 0.33, // Distribute among assets
        type: 'market'
      });
    } 
    else if (price > sma20) {
      // Short signal - sell with calculated position size  
      orders.push({
        side: 'sell',
        qty: positionSize * 0.33,  // Distribute among assets
        type: 'market'
      });
    }
    
    // Reset back to original symbol for next iteration
    ctx.sym = ctx.syms[0];
  }
  
  return orders.length > 0 ? orders : null;
}
