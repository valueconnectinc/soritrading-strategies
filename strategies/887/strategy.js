/*
 * @coinsori-strategy v1
 * name: Bollinger RSI Hybrid Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This hybrid strategy combines Bollinger Bands and RSI to improve signal accuracy. Bollinger Bands provide volatility context, while RSI identifies overbought/oversold conditions. The combination aims to reduce false signals and improve entry timing.
 * When it buys and sells: It buys when price closes below the lower Bollinger Band AND RSI is below 30 (oversold). It sells when price closes above the upper Bollinger Band AND RSI is above 70 (overbought).
 * When it does NOT work: This strategy may fail in sideways markets where price remains within the Bollinger Bands without clear overbought/oversold conditions, or if market volatility drops significantly.
 */

function onUpdate(ctx) {
  // Define indicator parameters
  const bbPeriod = 20;
  const bbMultiplier = 2.0;
  const rsiPeriod = 14;
  
  // Get indicators
  const bb = ctx.bb(bbPeriod, bbMultiplier, 0);
  const rsi = ctx.rsi(rsiPeriod, 0);
  
  // Check for valid data (warm-up period)
  if (bb == null || rsi == null) return null;
  
  // Extract Bollinger Band values
  const upper = bb.upper;
  const middle = bb.middle;
  const lower = bb.lower;
  
  // Define entry conditions
  // Buy condition: price closes below lower BB AND RSI is oversold (<30)
  const buyCondition = ctx.price < lower && rsi < 30;
  
  // Sell condition: price closes above upper BB AND RSI is overbought (>70)
  const sellCondition = ctx.price > upper && rsi > 70;
  
  // Generate orders
  if (buyCondition && ctx.position <= 0) {
    // Only buy if not already in position or short
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 }; // Buy 95% of available cash
  } else if (sellCondition && ctx.position > 0) {
    // Sell only if currently long
    return { side: 'sell', qty: ctx.position };
  }
  
  return null; // No action
}
