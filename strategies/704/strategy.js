/*
 * @coinsori-strategy v1
 * name: Volume Spike Detection Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy identifies trading opportunities based on sudden spikes in volume.
 * When the current volume exceeds a threshold (e.g., 2x the average volume), it signals a potential breakout or trend change.
 * It aims to capture significant market movements that may result from news or institutional activity.
 *
 * When it buys and sells: It buys when the current volume is 2 times higher than the average volume over the last 10 periods.
 * It sells when there is a position and current volume is below the threshold (indicating a potential reversal or pause).
 *
 * When it does NOT work: This strategy may fail in low-volume or stable market conditions where large spikes are rare.
 * It can also generate false signals during choppy or sideways markets.
 */

function onUpdate(ctx) {
  // Get volume and average volume
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(10);

  // Guard against nulls
  if (vol == null || avgVol == null) {
    return null;
  }

  // If volume is more than 2x average, buy with 99% of available cash
  if (vol > avgVol * 2) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // If we have a position and volume drops below threshold, sell the position
  if (ctx.position > 0 && vol < avgVol * 1.2) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // Do nothing
  return null;
}
