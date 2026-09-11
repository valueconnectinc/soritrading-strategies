/*
 * @coinsori-strategy v1
 * name: Volatility-based Mean Reversion with Trend Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses a volatility-based approach to mean reversion, taking into account ATR (Average True Range) as a measure of market volatility. It also implements a trend filter using RSI to avoid trading during strong trends.
 * When it buys and sells: It enters when price is far from its moving average in a low volatility environment and exits when price reverses direction or the trend changes according to RSI.
 * When it does NOT work: This strategy works poorly during extended volatile periods without clear mean reversion opportunities, or when market conditions are extremely choppy where no reliable pattern emerges.
 */

function onUpdate(ctx) {
  // Calculate indicators
  const sma = ctx.sma(20); // 20-period Simple Moving Average
  const bb = ctx.bb(20, 2); // Bollinger Bands with 20 period and 2 std dev
  const atr = ctx.atr(14); // 14-period Average True Range
  const rsi = ctx.rsi(14);
  
  // Check if indicators are ready (guard against null values)
  if (sma == null || bb == null || atr == null || rsi == null) return null;
  
  // Fetch current price
  const price = ctx.price;
  
  // Define volatility threshold for mean reversion opportunity
  // Using ATR to determine if market is sufficiently quiet for mean reversion
  const volatilityThreshold = atr * 2;
  
  // Calculate distance from moving average relative to volatility
  const distanceFromSMA = Math.abs(price - sma);
  
  // Trend filter: Only trade when RSI indicates neutral or overbought/oversold conditions
  const isBullishTrend = rsi < 30; // Oversold condition
  const isBearishTrend = rsi > 70; // Overbought condition
  
  // Entry conditions
  const shouldEnter = distanceFromSMA > volatilityThreshold && (isBullishTrend || isBearishTrend);
  
  // Exit conditions - based on price touching Bollinger Bands or change in trend
  const shouldExit = (price >= bb.upper || price <= bb.lower) || (!isBullishTrend && !isBearishTrend);
  
  // Exit all positions if no conditions are met
  if (!shouldEnter && !shouldExit) {
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }
  
  // If we're long and want to exit, sell
  if (ctx.position > 0 && shouldExit) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // If we're not long and want to enter, buy
  if (ctx.position == 0 && shouldEnter && isBullishTrend) {
    const qty = ctx.cash / price * 0.99; // Use 99% of cash for entry
    return { side: 'buy', qty: qty };
  }
  
  return null;
}
