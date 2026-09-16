/*
 * @coinsori-strategy v1
 * name: MACD Trend Filter Mean Reversion Strategy
 * ex: binanceusdm
 * syms: ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy attempts to improve the mean reversion approach by adding a trend filter using MACD. The idea is to avoid entering trades in strong trends, which can lead to losses. It uses Bollinger Bands for mean reversion and MACD for trend confirmation.
 * When it buys and sells: It buys when price touches the lower Bollinger Band and MACD trend is downwards (indicating a potential reversal). It sells when price touches the upper Bollinger Band and MACD trend is upwards, signaling potential exhaustion.
 * When it does NOT work: In very strong trending markets where the MACD signal does not align with price mean reversion, this strategy might miss opportunities or generate false signals. Also, if the volatility of ETH changes dramatically, the strategy may need adjustments.
 */

function onUpdate(ctx) {
  // Use MACD for trend confirmation
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  
  // Bollinger Bands for mean reversion
  const bb = ctx.bb(20, 2, 0);
  const bbPrev = ctx.bb(20, 2, 1);
  
  // Check if indicators are ready
  if (macd == null || macdPrev == null || bb == null || bbPrev == null) {
    return null;
  }
  
  // Ensure that we have the necessary data
  const price = ctx.price;
  const lowerBand = bb.lower;
  const upperBand = bb.upper;
  const prevLowerBand = bbPrev.lower;
  const prevUpperBand = bbPrev.upper;
  
  if (price == null || lowerBand == null || upperBand == null) {
    return null;
  }
  
  // Trend confirmation using MACD
  // If the MACD line is below the signal line, consider downtrend
  // If the MACD line is above the signal line, consider uptrend
  
  const isUptrend = (macd.macd > macd.signal);
  const wasUptrend = (macdPrev.macd > macdPrev.signal);
  
  if (ctx.position !== 0) {
    // Check for exit signals
    if (isUptrend && ctx.position > 0) {
      // If we're in an uptrend, and we have a long position, consider closing it
      return { side: 'sell', qty: ctx.position };
    }
    
    if (!isUptrend && ctx.position < 0) {
      // If we're in a downtrend, and we have a short position, consider closing it
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
  }
  
  // Entry signals with trend confirmation
  if (!isUptrend && !wasUptrend) {
    // If we are in a downtrend (or flat), and price touches the lower BB, consider buying
    if (price <= lowerBand) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  } else if (isUptrend && wasUptrend) {
    // If we are in an uptrend, and price touches the upper BB, consider selling
    if (price >= upperBand) {
      return { side: 'sell', qty: ctx.position }; // Close existing position or sell if no position
    }
  }
  
  // No entry signal
  return null;
}
