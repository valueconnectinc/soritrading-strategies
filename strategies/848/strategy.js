/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy exploits mean reversion around Bollinger Band thresholds. When price touches lower band, it's considered oversold and likely to revert upward; similarly, when it touches upper band, it's overbought and likely to revert downward.
 * When it buys and sells: It buys when the price crosses below the lower Bollinger Band and sells when it crosses above the upper Bollinger Band. The logic is based on price returning to the mean after deviating too far from it.
 * When it does NOT work: This strategy performs poorly in strong trending markets where price continues moving in one direction for extended periods, failing to find mean reversion opportunities.
 */

function onUpdate(ctx) {
  // Bollinger Band parameters
  const bbLength = 20;
  const bbMultiplier = 2.0;
  
  // Get Bollinger Band values
  const bb = ctx.bb(bbLength, bbMultiplier, 0);
  if (bb == null) return null;

  // Previous bar values
  const bbPrev = ctx.bb(bbLength, bbMultiplier, 1);
  if (bbPrev == null) return null;
  
  // Current and previous price
  const price = ctx.price;
  const pricePrev = ctx.closes[1];

  // Check for mean reversion signals
  // Buy when price crosses below lower band (oversold condition)
  if (pricePrev >= bbPrev.lower && price < bb.lower) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Sell when price crosses above upper band (overbought condition)
  if (pricePrev <= bbPrev.upper && price > bb.upper) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
