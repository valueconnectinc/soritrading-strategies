/*
 * @coinsori-strategy v1
 * name: Fear-Greed Index Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses the fear and greed index as a signal to decide when to enter or exit positions.
 * It buys when the index is below 30 (fear), and sells when it's above 70 (greed).
 * The strategy aims to take advantage of market extremes where sentiment is extreme.
 *
 * When the fear-greed index drops below 30, it suggests a buying opportunity because 
 * investors are overly fearful. Conversely, when the index rises above 70, it signals 
 * excessive euphoria and may be a good time to reduce exposure.
 *
 * This strategy does not work well in strongly trending markets where the fear-greed
 * index remains consistently high or low for extended periods.
 */

function onUpdate(ctx) {
  // Get the fear and greed index value using the external dataset
  const fg = ctx.data('fear_greed');
  
  // Wait for data to be available
  if (fg == null) return null;
  
  // Define thresholds
  const fearThreshold = 30;   // Buy when fear index is below this
  const greedThreshold = 70;  // Sell when greed index is above this
  
  // Check current position
  const pos = ctx.position;
  
  // If we are currently long, look for exit condition
  if (pos > 0) {
    // Sell if the index suggests greed (overbought)
    if (fg >= greedThreshold) {
      return { side: 'sell', qty: pos };
    }
  } 
  // If we are currently flat or short, look for entry condition
  else {
    // Buy if the index suggests fear (oversold)
    if (fg <= fearThreshold) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }
  
  // Do nothing if no trade conditions are met
  return null;
}
