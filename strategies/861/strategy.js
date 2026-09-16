/*
 * @coinsori-strategy v1
 * name: BTC Fear & Greed Index Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The fear and greed index can signal shifts in market sentiment, which may lead to predictable price movements. Using this index we aim to enter long positions when the market is fearful.
 * When it buys and sells: It buys when the fear & greed index falls below 30 (fear zone) and sells when it rises above 70 (greed zone).
 * When it does NOT work: This strategy may fail in strongly trending markets or during prolonged periods of extreme sentiment where the index doesn't reflect true market price action.
 */
function onUpdate(ctx) {
  // Fetch data from external dataset
  const fgIndex = ctx.data('fear_greed_index');
  
  // Ensure we have data before proceeding
  if (fgIndex == null) return null;

  // Define thresholds for buying and selling based on Fear & Greed Index
  const fearThreshold = 30;   // Buy condition: index below this value (fear)
  const greedThreshold = 70;  // Sell condition: index above this value (greed)

  // Log the current index value for monitoring
  ctx.log(`Fear & Greed Index: ${fgIndex}`);

  // Buy when fear threshold is met and we are not already in position
  if (fgIndex < fearThreshold && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }

  // Sell when greed threshold is met and we have an open position
  if (fgIndex > greedThreshold && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action otherwise
  return null;
}
