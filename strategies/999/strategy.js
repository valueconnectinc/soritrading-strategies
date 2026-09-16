/*
 * @coinsori-strategy v1
 * name: Simple BB Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: This strategy uses Bollinger Bands to identify mean reversion opportunities in a single asset (BTC). When the price moves beyond the upper or lower band, it suggests that the price may revert to the middle band.
 * When it buys and sells: It buys when the price crosses below the lower band, and sells when the price crosses above the upper band.
 * When it does NOT work: This strategy fails in strong trending markets where prices remain at extreme levels for extended periods. It also struggles during high volatility periods where the bands are too wide and false signals occur frequently.
 */

function onUpdate(ctx) {
  // Define constants
  const BB_WINDOW = 20;
  const BB_MULT = 2;

  // Get current price
  const price = ctx.price;
  
  if (price == null) return null;

  // Calculate Bollinger Bands
  const bb = ctx.bb(BB_WINDOW, BB_MULT, 0);
  if (bb == null || bb.upper == null || bb.lower == null) return null;

  const upperBand = bb.upper;
  const lowerBand = bb.lower;
  
  // Simple mean reversion strategy based on BB bands
  if (price < lowerBand) { // Price is below lower band, buy
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  } else if (price > upperBand) { // Price is above upper band, sell
    return { side: 'sell', qty: ctx.position };
  }
  
  // Return null if no action is needed
  return null;
}
