/*
 * @coinsori-strategy v1
 * name: Improved MACD Trend Filter Mean Reversion Strategy
 * ex: binanceusdm
 * syms: ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This improved strategy adds a RSI filter to the MACD trend filter mean reversion approach. The idea is to avoid trades when the market is overbought or oversold, which can lead to false signals.
 * When it buys and sells: It buys when price touches the lower Bollinger Band, MACD trend is downwards, and RSI is below 30 (oversold). It sells when price touches the upper Bollinger Band, MACD trend is upwards, and RSI is above 70 (overbought).
 * When it does NOT work: In very strong trending markets where the MACD and RSI signals do not align with price mean reversion, this strategy might miss opportunities. Also, if the volatility of ETH changes dramatically or RSI thresholds need adjustment, the strategy may require tuning.
 */

function onUpdate(ctx) {
  // Use MACD for trend confirmation
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  
  // Bollinger Bands for mean reversion
  const bb = ctx.bb(20, 2, 0);
  const bbPrev = ctx.bb(20, 2, 1);
  
  // RSI for additional filter
  const rsi = ctx.rsi(14, 0);
  const rsiPrev = ctx.rsi(14, 1);
  
  // Check if indicators are ready
  if (macd == null || macdPrev == null || bb == null || bbPrev == null || rsi == null || rsiPrev == null) {
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
  const isUptrend = (macd.macd > macd.signal);
  const wasUptrend = (macdPrev.macd > macdPrev.signal);
  
  // RSI filter
  const isOversold = (rsi < 30);
  const wasOversold = (rsiPrev < 30);
  const isOverbought = (rsi > 70);
  const wasOverbought = (rsiPrev > 70);
  
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
  
  // Entry signals with trend and RSI filters
  if (!isUptrend && !wasUptrend) {
    // If we are in a downtrend (or flat), and price touches the lower BB, consider buying
    if (price <= lowerBand && isOversold) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  } else if (isUptrend && wasUptrend) {
    // If we are in an uptrend, and price touches the upper BB, consider selling
    if (price >= upperBand && isOverbought) {
      return { side: 'sell', qty: ctx.position }; // Close existing position or sell if no position
    }
  }
  
  // No entry signal
  return null;
}
