/*
 * @coinsori-strategy v1
 * name: Volatility breakout with ATR filter
 * ex: binanceusdm
 * syms: ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy identifies breakouts based on price movements that exceed a certain volatility threshold (ATR). It is designed to catch strong trends while filtering out noise.
 * When it buys and sells: It enters a long position when the price breaks above the upper band of a moving average plus a multiple of ATR. It enters a short position when the price breaks below the lower band. It closes positions when the price crosses back to the moving average.
 * When it does NOT work: During ranging or low-volatility markets, this strategy might generate too many false signals and incur losses. The ATR filter may not be responsive enough to sudden volatility changes.
 */

function onUpdate(ctx) {
  // Calculate necessary indicators
  const atr = ctx.atr(14);           // ATR for volatility filtering
  const sma = ctx.sma(20);           // Moving average for breakout level
  const high = ctx.high(20);         // Highest high over the last 20 periods
  const low = ctx.low(20);           // Lowest low over the last 20 periods

  // Check if enough data is available
  if (atr == null || sma == null || high == null || low == null) return null;

  // Define breakout levels
  const upperBand = sma + (atr * 1.5);
  const lowerBand = sma - (atr * 1.5);

  // Long entry: Price breaks above the upper band (high volatility breakout)
  if (ctx.price > upperBand && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Exit long: Price crosses back below the moving average
  if (ctx.price < sma && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // Short entry: Price breaks below the lower band (low volatility breakout)
  if (ctx.price < lowerBand && ctx.position >= 0) {
    return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 }; // Sell short
  }

  // Cover short: Price crosses back above the moving average
  if (ctx.price > sma && ctx.position < 0) {
    return { side: 'buy', qty: Math.abs(ctx.position) }; // Buy to cover
  }

  return null;
}
