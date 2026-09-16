/*
 * @coinsori-strategy v1
 * name: Fear-Greed Index Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses the Fear & Greed Index to identify overbought/oversold conditions.
 * When the index is above 70 (extreme greed), it sells.
 * When the index is below 30 (extreme fear), it buys.
 * It reverts the position when the index crosses the middle ground (50).
 * Why this strategy: The Fear & Greed Index provides a sentiment indicator that can help identify
 * turning points in the market based on emotional behavior. When sentiment becomes too extreme,
 * a reversal may be imminent.
 * When it buys and sells: It buys when the index drops below 30, sells when it rises above 70.
 * When it does NOT work: This strategy may fail during strong trending markets where fear or greed
 * remains high for an extended period. In such regimes, the mean reversion logic loses its edge.
 */

function onUpdate(ctx) {
  // Load the Fear & Greed Index data from external dataset
  const fg = ctx.data('fear_greed');
  
  // Check if we have valid data to work with
  if (fg == null) return null;

  // Define thresholds for fear and greed
  const fearThreshold = 30;    // Below this is fear
  const greedThreshold = 70;   // Above this is greed  

  // Entry and exit conditions based on index values
  if (fg < fearThreshold) {
    // If we are not already long, buy
    if (ctx.position <= 0) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  } else if (fg > greedThreshold) {
    // If we are not already short, sell
    if (ctx.position >= 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // If the index is in the middle range and we have a position, close it
  if (fg > fearThreshold && fg < greedThreshold && ctx.position !== 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
