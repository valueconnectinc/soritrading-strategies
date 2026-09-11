/*
 * @coinsori-strategy v1
 * name: Fear Greed Index Based Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the Fear & Greed Index to determine market sentiment. 
 * When the index is in "Extreme Fear" or "Fear" zones, it buys BTC; when in "Extreme Greed" or "Greed" zones, it sells.
 * When the index is neutral (i.e., neither extreme), it stays idle.
 *
 * When it buys and sells: It buys during extreme fear conditions and sells during extreme greed conditions. 
 * It holds positions while values stay in neutral areas.
 *
 * When it does NOT work: The strategy may fail when the Fear & Greed Index does not correlate well with actual price movement,
 * especially in long-term trends or sudden market shocks where the index might lag behind.
 */

function onUpdate(ctx) {
  // Fetch Fear & Greed Index data (assumes it is available through ctx.data)
  const fg = ctx.data('fear_greed');
  
  // Guard against null values
  if (fg == null) return null;
  
  // Define thresholds for Fear & Greed index (based on typical values from https://alternative.me/crypto/fear-and-greed-index/)
  const FEAR_THRESHOLD = 30;    // Enter long if index is below this
  const GREED_THRESHOLD = 70;   // Enter short if index is above this
  
  // Check current position
  const pos = ctx.position;
  
  // If currently in a position
  if (pos > 0) {
    // Exit long if we are in greed zone
    if (fg >= GREED_THRESHOLD) {
      return { side: 'sell', qty: pos };
    }
    // Or if we're in neutral zone, close position (if needed)
    else if (fg > FEAR_THRESHOLD && fg < GREED_THRESHOLD) {
      return { side: 'sell', qty: pos };  
    }
  } else if (pos < 0) {
    // Exit short if we are in fear zone
    if (fg <= FEAR_THRESHOLD) {
      return { side: 'buy', qty: Math.abs(pos) };
    }
    // Or if we're in neutral zone, close position (if needed)
    else if (fg > FEAR_THRESHOLD && fg < GREED_THRESHOLD) {
      return { side: 'buy', qty: Math.abs(pos) };
    }
  } else {
    // No current position
    // Enter long if index is below fear threshold (extreme fear)
    if (fg <= FEAR_THRESHOLD) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    // Enter short if index is above greed threshold (extreme greed)
    else if (fg >= GREED_THRESHOLD) {
      return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 };
    }
  }
  
  // Otherwise, do nothing
  return null;
}
