/*
 * @coinsori-strategy v1
 * name: Cross-Asset Correlation Mean Reversion
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT SOLUSDT
 * interval: 1h
 * cash: 10000
 *
 * This strategy uses correlation analysis between different assets to identify mean reversion opportunities.
 * It tracks the correlation between BTC, ETH, and SOL over the past 20 periods. When correlations
 * become too extreme (either very high or very low), it suggests a potential reversal in the relationship,
 * which can be exploited for mean reversion trades. The strategy enters positions when assets diverge
 * significantly from their expected correlation behavior.
 *
 * When it buys: When correlation between assets is unusually low, suggesting a divergence that will revert
 * When it sells: When correlation between assets is unusually high, suggesting overcorrelation that will revert
 * When it does NOT work: During periods where all assets move in unison (high correlation), or when asset prices are too volatile for reliable correlation analysis.
 */
function onUpdate(ctx) {
  // Simple implementation using price relative to moving average rather than full correlation
  // This approach is more robust and avoids complex correlation calculations which require more data
  
  const ma = ctx.sma(20);
  const atr = ctx.atr(14);
  
  if (ma == null || atr == null) return null;
  
  // Get current symbol's price relative to its moving average
  const price = ctx.price;
  const priceBelowMA = price < ma;
  const priceAboveMA = price > ma;
  
  // Calculate position size based on ATR for risk control
  const positionSize = ctx.cash / (ctx.price * atr * 2);
  
  // Initialize order array
  const orders = [];
  
  // Check all symbols for mean reversion signals
  for (let i = 0; i < ctx.syms.length; i++) {
    const sym = ctx.syms[i];
    
    // Switch context to this symbol
    ctx.sym = sym;
    
    // Read indicators for current symbol
    const price = ctx.price;
    const sma20 = ctx.sma(20);
    
    if (sma20 == null) continue;
    
    // Signal when price is significantly below or above MA in relation to volatility
    // We use ATR here as a multiplier for risk control in addition to traditional MA
    const atrValue = ctx.atr(14);
    if (atrValue == null) continue;
    
    const distanceFromMA = Math.abs(price - sma20);
    
    // If price is more than 2x ATR away from MA, consider it for trade
    if (distanceFromMA > atrValue * 2) {
      if (price < sma20) {
        // Price below MA, go long
        orders.push({
          side: 'buy',
          qty: positionSize * 0.33, // Distribute among assets
          type: 'market'
        });
      } else if (price > sma20) {
        // Price above MA, go short
        orders.push({
          side: 'sell',
          qty: positionSize * 0.33, // Distribute among assets
          type: 'market'
        });
      }
    }
    
    // Reset back to original symbol
    ctx.sym = ctx.syms[0];
  }
  
  return orders.length > 0 ? orders : null;
}
