/*
 * @coinsori-strategy v1
 * name: Fear Greed Index Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The fear-greed index can indicate market sentiment. 
 * When the index is in the "fear" or "extreme fear" zone, it may suggest a good buying opportunity.
 * When the index is in the "greed" or "extreme greed" zone, it may signal a potential sell point.
 *
 * When it buys and sells: It buys when the fear-greed index is below 30 (fear/extreme fear).
 * It sells when the fear-greed index is above 70 (greed/extreme greed).
 *
 * When it does NOT work: This strategy may not perform well during strong trends where 
 * the fear-greed index remains persistently in one zone. Also, it does not account for fundamental changes.
 */
function onUpdate(ctx) {
  // Get the fear-greed index value from data
  const fg = ctx.data('fear_greed');
  if (fg == null) return null;
  
  // Define thresholds for buying and selling
  // Buy when fear-greed index is below 30 (fear or extreme fear)
  const buyThreshold = 30;
  // Sell when fear-greed index is above 70 (greed or extreme greed)
  const sellThreshold = 70;
  
  // Check if we are currently in a position
  const position = ctx.position;
  
  // Buy signal: Fear-greed index is below buy threshold and no position
  if (fg < buyThreshold && position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell signal: Fear-greed index is above sell threshold and we have a position
  if (fg > sellThreshold && position > 0) {
    return { side: 'sell', qty: position };
  }
  
  // No action
  return null;
}
