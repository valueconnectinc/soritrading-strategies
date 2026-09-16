/*
 * @coinsori-strategy v1
 * name: Improved Mean Reversion with Filters
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This is an improved version of the mean reversion strategy that incorporates additional filters to reduce false signals. The strategy uses a combination of EMA crossovers, RSI, and Bollinger Bands to confirm mean-reverting behavior.
 * When it buys and sells: It enters a long position when price crosses below the lower Bollinger Band and the 50 EMA is below the 200 EMA. It exits when price reaches the upper Bollinger Band or RSI overbought level.
 * When it does NOT work: In strong trending markets, this strategy may generate false signals as it tries to reverse a trend that continues in the same direction.
 */
function onUpdate(ctx) {
  // Calculate required indicators
  const ema50 = ctx.ema(50, 0);
  const ema200 = ctx.ema(200, 0);
  const prev_ema50 = ctx.ema(50, 1);
  const prev_ema200 = ctx.ema(200, 1);
  const bb = ctx.bb(20, 2, 0);
  const rsi = ctx.rsi(14, 0);
  const prev_rsi = ctx.rsi(14, 1);
  
  // Check for valid indicator data
  if (ema50 == null || ema200 == null || prev_ema50 == null || prev_ema200 == null || bb == null || rsi == null || prev_rsi == null) return null;
  
  // Buy condition: Price below lower Bollinger Band + EMA50 below EMA200
  const belowLowerBand = ctx.price < bb.lower;
  const emaTrendDown = prev_ema50 < prev_ema200 && ema50 > ema200;
  
  // Sell condition: Price above upper Bollinger Band or RSI overbought
  const aboveUpperBand = ctx.price > bb.upper;
  const rsiOversold = prev_rsi >= 70 && rsi < 70;
  const rsiOverbought = prev_rsi <= 30 && rsi > 30;
  
  if (belowLowerBand && emaTrendDown) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Close position on upper band or RSI oversold
  if ((aboveUpperBand || rsiOverbought) && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // Close position on RSI oversold
  if (rsiOversold && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
