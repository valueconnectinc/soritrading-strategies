/*
 * @coinsori-strategy v1
 * name: Simple Mean Reversion with MA and Bollinger Bands
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses a combination of moving average and Bollinger Bands to identify mean-reversion opportunities. When the price moves beyond the upper or lower Bollinger Band, it indicates potential overextension and suggests a pullback.
 * When it buys and sells: It buys when the price touches the lower Bollinger Band and sells when the price touches the upper Bollinger Band.
 * When it does NOT work: This strategy may fail during strong trending markets where price continues to move in the trend direction, rather than reverting. It also fails on extremely volatile periods with unpredictable price movements.
 */

function onUpdate(ctx) {
  // Define parameters for moving average and Bollinger Bands
  const maLength = 20;
  const bbLength = 20;
  const bbMultiplier = 2;

  // Get the current price
  const price = ctx.price;

  // Calculate moving average and Bollinger Bands
  const ma = ctx.sma(maLength);
  const bb = ctx.bb(bbLength, bbMultiplier);

  // Wait until we have enough data
  if (ma == null || bb == null || bb.upper == null || bb.lower == null) {
    return null;
  }

  // Check for entry conditions
  if (price <= bb.lower) {
    // Price has touched the lower Bollinger Band, time to buy
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  } else if (price >= bb.upper) {
    // Price has touched the upper Bollinger Band, time to sell
    return { side: 'sell', qty: ctx.position };
  }

  // No action
  return null;
}
