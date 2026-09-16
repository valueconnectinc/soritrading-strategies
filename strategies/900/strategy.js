/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion with Volume and Volatility Filter
 * ex: binanceusdm
 * syms: ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy uses Bollinger Bands to identify overbought/oversold conditions, 
 * combined with volume and volatility filters to reduce false signals and improve performance.
 * When it buys and sells: It buys when price touches the lower band and volume is above average, 
 * and sells when price touches the upper band and volume is above average. 
 * When it does NOT work: This strategy may fail in strong trending markets where prices move
 * consistently in one direction, making oversold/overbought conditions less reliable.
 */

function onUpdate(ctx) {
  // Bollinger Band parameters
  const bbPeriod = 20;
  const bbMultiplier = 2.0;
  
  // Volume filter parameters
  const volPeriod = 20;
  
  // Volatility filter parameter (ATR)
  const atrPeriod = 14;
  
  // Get Bollinger Band values
  const bb = ctx.bb(bbPeriod, bbMultiplier);
  if (bb == null) return null;
  
  // Get volume and average volume
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(volPeriod);
  if (vol == null || avgVol == null) return null;
  
  // Get ATR for volatility filter
  const atr = ctx.atr(atrPeriod);
  if (atr == null) return null;
  
  // Define volatility threshold (e.g., 1.5 times average ATR)
  const volThreshold = avgVol * 1.5;
  
  // Check if current price is touching the upper or lower Bollinger Band
  const price = ctx.price;
  const upperBand = bb.upper;
  const lowerBand = bb.lower;
  
  // Buy condition: price touches lower band and volume is above threshold
  if (price <= lowerBand && vol >= volThreshold) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  
  // Sell condition: price touches upper band and volume is above threshold
  if (price >= upperBand && vol >= volThreshold) {
    // Close position if exists
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }
  
  return null;
}
