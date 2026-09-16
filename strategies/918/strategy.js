/*
 * @coinsori-strategy v1
 * name: BBand Mean Reversion Strategy Improved v2
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy uses Bollinger Bands to identify overbought and oversold conditions for mean reversion trading.
 * When it buys and sells: Buys when price touches the lower band and sells when price touches the upper band, aiming to profit from price mean reversion.
 * When it does NOT work: This strategy may not work consistently during strong trending markets or periods of high volatility where prices break out of Bollinger Bands for extended periods.
 */
function onUpdate(ctx) {
  // Bollinger Band parameters
  const bbLength = 20;
  const bbMultiplier = 2.0;

  // Get the current Bollinger Band values
  const bb = ctx.bb(bbLength, bbMultiplier, 0);
  if (bb == null) return null;
  
  // Get the previous Bollinger Band values
  const bbPrev = ctx.bb(bbLength, bbMultiplier, 1);
  if (bbPrev == null) return null;

  // Check if price crosses from below to above the lower band (buy condition)
  if (ctx.price < bb.lower && ctx.price > bb.upper && ctx.position === 0) {
    const qty = ctx.cash / ctx.price * 0.99;
    return { side: 'buy', qty };
  }
  
  // Check if price crosses from above to below the upper band (sell condition)
  if (ctx.price > bb.upper && ctx.price < bb.lower && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
