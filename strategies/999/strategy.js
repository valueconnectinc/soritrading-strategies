/*
 * @coinsori-strategy v1
 * name: Mean Reversion Pair Trading Strategy
 * ex: binanceusdm
 * syms: BTCUSDT, ETHUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: This strategy exploits mean reversion in the price spread between two correlated assets (BTC and ETH). When the spread deviates significantly from its historical average, it suggests a temporary mispricing which can be traded against.
 * When it buys and sells: It buys when the spread is below its moving average (indicating ETH is stronger than BTC), and sells when the spread is above its moving average (indicating BTC is stronger than ETH).
 * When it does NOT work: This strategy fails during trending markets or periods of high correlation volatility where the spread does not revert to the mean quickly. It also underperforms in very low volatility environments.
 */

function onUpdate(ctx) {
  // Define constants
  const SPREAD_WINDOW = 20;
  const ENTRY_THRESHOLD = 2; // Standard deviations from mean
  const EXIT_THRESHOLD = 1;  // Standard deviations from mean
  const POSITION_SIZE = 0.95;

  // Get the prices of both assets
  const btcPrice = ctx.price;
  const ethPrice = ctx.ref(1).price;
  
  // Check if we have enough data for both assets
  if (btcPrice == null || ethPrice == null) return null;

  // Calculate the spread between the two assets
  const spread = btcPrice - ethPrice;

  // Use Bollinger Bands to determine entry and exit points
  const bb = ctx.bb(SPREAD_WINDOW, 2, 0);
  if (bb == null || bb.upper == null || bb.lower == null) return null;

  const upperBand = bb.upper;
  const lowerBand = bb.lower;

  // Determine entry signals based on the spread
  if (spread < lowerBand) { // Spread is below lower band, buy BTC sell ETH
    // Ensure we are not already in a position
    if (ctx.position == 0) {
      return [
        { side: 'buy', qty: ctx.cash / btcPrice * POSITION_SIZE },   // Buy BTC
        { side: 'sell', qty: ctx.cash / ethPrice * POSITION_SIZE }     // Sell ETH
      ];
    }
  } else if (spread > upperBand) { // Spread is above upper band, buy ETH sell BTC
    if (ctx.position == 0) {
      return [
        { side: 'buy', qty: ctx.cash / ethPrice * POSITION_SIZE },   // Buy ETH
        { side: 'sell', qty: ctx.cash / btcPrice * POSITION_SIZE }     // Sell BTC
      ];
    }
  }

  // If we are already in a position and spread is returning towards mean, exit
  if (ctx.position > 0) {
    // Check if we are getting closer to the mean
    const spreadSma = ctx.sma(SPREAD_WINDOW, 0);
    if (spreadSma == null) return null;
    
    // For exit condition, we check if the spread is approaching the mean
    if (Math.abs(spread - spreadSma) < Math.abs(spreadSma * EXIT_THRESHOLD)) {
      return { side: 'sell', qty: ctx.position }; // Close the position
    }
  }

  // Return null if no action is needed
  return null;
}
