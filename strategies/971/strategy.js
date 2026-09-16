/*
 * @coinsori-strategy v1
 * name: Mean Reversion with Volatility Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy exploits mean reversion opportunities in volatile markets by combining Bollinger Bands with a volatility filter. It aims to enter when price moves significantly away from the mean, expecting a return towards the center.
 * When it buys and sells: The strategy buys when price touches the lower Bollinger Band and exits when price crosses back toward the middle band. It sells when price hits the upper Bollinger Band and exits when price moves back toward the middle band.
 * When it does NOT work: This strategy fails in strong trending markets, where price moves persistently away from the mean. It also underperforms during periods of low volatility, where there are few reversion opportunities.
 */

function onUpdate(ctx) {
  // Parameters for Bollinger Bands and volatility filter
  const bbLength = 20;
  const bbMultiplier = 2.0;
  const volWindow = 10;
  
  // Get Bollinger Band values
  const bb = ctx.bb(bbLength, bbMultiplier);
  
  // Get volatility measure (standard deviation)
  const volatility = ctx.atr(volWindow);
  
  // Check if we have enough data
  if (bb == null || volatility == null) return null;
  
  // Define thresholds for mean reversion
  const lowerBand = bb.lower;
  const upperBand = bb.upper;
  const middleBand = bb.middle;
  
  // Volatility filter - only trade when volatility is above a certain threshold
  const minVolatility = 100; // Example threshold, can be tuned
  
  if (volatility < minVolatility) return null; // Skip trades if volatility is too low
  
  // Entry conditions for long position
  if (ctx.price <= lowerBand && ctx.position <= 0) {
    // Buy when price touches or goes below the lower band
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.99
    };
  }
  
  // Exit conditions for long position
  if (ctx.position > 0 && ctx.price >= middleBand) {
    // Sell when price crosses back towards the middle band
    return {
      side: 'sell',
      qty: ctx.position
    };
  }
  
  // Entry conditions for short position
  if (ctx.price >= upperBand && ctx.position >= 0) {
    // Sell when price touches or goes above the upper band
    return {
      side: 'sell',
      qty: ctx.cash / ctx.price * 0.99
    };
  }
  
  // Exit conditions for short position
  if (ctx.position < 0 && ctx.price <= middleBand) {
    // Buy back when price crosses back towards the middle band
    return {
      side: 'buy',
      qty: Math.abs(ctx.position)
    };
  }
  
  // No action
  return null;
}
