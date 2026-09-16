/*
 * @coinsori-strategy v1
 * name: Mean Reversion Strategy on BTCUSDT
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy bets on the mean-reverting behavior of BTCUSDT price. When price deviates significantly from its moving average, it is expected to revert back towards the mean.
 * When it buys and sells: It buys when price is below a certain threshold (e.g., 2 standard deviations below the SMA), and sells when price crosses above this threshold.
 * When it does NOT work: This strategy fails during strong trending markets where prices continue to move in one direction for extended periods, breaking out of mean-reverting patterns.
 */

function onUpdate(ctx) {
  // Define parameters
  const smaLength = 20;
  const stdDevThreshold = 2;

  // Calculate SMA and standard deviation
  const sma = ctx.sma(smaLength);
  if (sma == null) return null;

  const prices = ctx.closes.slice(-smaLength);
  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    sum += prices[i];
  }
  const mean = sum / prices.length;

  let sumSquaredDeviations = 0;
  for (let i = 0; i < prices.length; i++) {
    sumSquaredDeviations += Math.pow(prices[i] - mean, 2);
  }
  const stdDev = Math.sqrt(sumSquaredDeviations / prices.length);

  // Calculate the upper and lower thresholds
  const upperThreshold = sma + stdDevThreshold * stdDev;
  const lowerThreshold = sma - stdDevThreshold * stdDev;

  // Decide action based on price relative to thresholds
  if (ctx.price < lowerThreshold) {
    // Buy when price is below the lower threshold
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (ctx.price > upperThreshold && ctx.position > 0) {
    // Sell when price is above the upper threshold and we have a long position
    return { side: 'sell', qty: ctx.position };
  }

  // Do nothing otherwise
  return null;
}
