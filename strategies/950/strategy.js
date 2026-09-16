/*
 * @coinsori-strategy v1
 * name: BTC Trend Filter Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy applies a trend filter using the 20-period SMA to identify the direction of the market. It enters long positions only when the price is above the SMA, aiming to align with the overall trend. It also uses a simple volatility filter based on ATR to avoid entering during low-volatility periods.
 * When it buys and sells: The strategy buys when the price is above the 20-period SMA and volatility (ATR) is high enough to signal a strong move. It sells either when a Take Profit of 2% is hit or when the price drops below the SMA, indicating a trend change.
 * When it does NOT work: This strategy may underperform during sideways markets where the price remains close to the SMA for extended periods. Additionally, if the trend filter is too sensitive or too loose, it might enter or exit at suboptimal times.
 */

function onUpdate(ctx) {
  // === INDICATORS ===
  
  const sma20 = ctx.sma(20);
  const atr14 = ctx.atr(14);
  const currentPrice = ctx.price;
  const previousClose = ctx.closes[1];

  // === GUARD AGAINST NULLS ===
  
  if (sma20 == null || atr14 == null) {
    return null;
  }
  
  // === ENTRY CONDITIONS ===
  
  const isTrendingUp = currentPrice > sma20;
  const volatilityHigh = atr14 / currentPrice > 0.005; // ATR as % of price > 0.5%

  // === EXIT CONDITIONS ===
  
  const isTrendingDown = currentPrice < sma20;
  const takeProfitTriggered = (currentPrice - ctx.entryPx) / ctx.entryPx > 0.02; // 2% Take profit

  // === TRADE EXECUTION ===
  
  // Close position if take-profit triggered
  if (ctx.position > 0 && takeProfitTriggered) {
    return { side: 'sell', qty: ctx.position };
  }

  // Buy condition: price above SMA and high volatility
  if (
    ctx.position === 0 && 
    isTrendingUp && 
    volatilityHigh
  ) {
    const buyQty = ctx.cash / currentPrice * 0.95; // Use 95% of cash for buy
    return { side: 'buy', qty: buyQty };
  }
  
  // Exit long if trending down (simple rule)
  if (
    ctx.position > 0 && 
    isTrendingDown
  ) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // No action
  return null;
}
