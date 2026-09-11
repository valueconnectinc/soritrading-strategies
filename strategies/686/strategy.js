/*
 * @coinsori-strategy v1
 * name: Volume Breakout Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy identifies breakouts based on volume spikes, which often precede significant price movements. It aims to capture momentum shifts by entering trades when trading volume exceeds a threshold.
 * When it buys and sells: The strategy buys when the current volume exceeds the average volume by a certain factor, and sells when the position is open and the price moves against the trend.
 * When it does NOT work: This strategy may fail in low-volume markets or during periods of high volatility where breakout signals are unreliable.
 */
function onUpdate(ctx) {
  // Define the volume threshold
  const volThreshold = 2;

  // Calculate average volume over a certain period
  const avgVol = ctx.avgVol(20);

  // Guard against null values
  if (avgVol == null || ctx.vol == null) return null;

  // Buy condition: current volume exceeds average volume by threshold
  if (ctx.vol > avgVol * volThreshold && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: close position if there is an open position and price moves against trend
  if (ctx.position > 0) {
    const prevPrice = ctx.closes[1];
    if (prevPrice != null && ctx.price < prevPrice) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // No action
  return null;
}
