/*
 * @coinsori-strategy v1
 * name: Mean Reversion with ATR Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: The strategy attempts to capture mean-reverting behavior in BTCUSDT price, but filters trades through a volatility measure (ATR) to avoid entering during clearly trending markets. It assumes that when price moves significantly beyond its average for a period, it will revert back.
 * When it buys and sells: Buys when price drops below a certain number of ATRs from the moving average, and sells when it moves above that threshold — both entries are filtered by ATR to ensure volatility-based conditions. 
 * When it does NOT work: This strategy does not work when the market is strongly trending or when the chosen ATR period and thresholds are inappropriate for current volatility conditions.
 */

function onUpdate(ctx) {
  // Get indicators
  const price = ctx.price;
  const sma = ctx.sma(20); // 20-period SMA
  const atr = ctx.atr(14); // 14-period ATR
  
  // Guard against null values
  if (sma == null || atr == null) return null;

  // Calculate the thresholds for mean reversion based on ATR
  const upperThreshold = sma + atr * 1.5; // Buy if price is below this level
  const lowerThreshold = sma - atr * 1.5; // Sell if price is above this level
  
  // Check if we are in a position to trade (i.e., no open orders)
  if (ctx.position === 0) {
    // Enter long when price drops below lower threshold
    if (price < lowerThreshold) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  } else if (ctx.position > 0) {
    // Exit position if price crosses upper threshold
    if (price > upperThreshold) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null; // Do nothing if no conditions are met
}
