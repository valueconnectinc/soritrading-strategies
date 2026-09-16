/*
 * @coinsori-strategy v1
 * name: RSI-Based Mean Reversion with Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT ADAUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Utilizes the Relative Strength Index (RSI) for mean reversion trading, applying a volume filter to reduce false signals. The strategy aims to identify overbought/oversold conditions and enter trades when price action suggests a reversal.
 * When it buys and sells: Buys when RSI crosses below 30 (oversold) and volume is above average, sells when RSI crosses above 70 (overbought) and volume is above average.
 * When it does NOT work: This strategy may fail during strong trending markets where RSI remains in overbought/oversold zones for extended periods, or when volume data is unreliable.
 */

function onUpdate(ctx) {
  // Define RSI parameters
  const rsiLength = 14;
  const volumeLength = 20;

  // Fetch volume data
  const currentVolume = ctx.vol;
  const avgVolume = ctx.avgVol(volumeLength);
  if (currentVolume == null || avgVolume == null || avgVolume === 0) return null;

  // Compute RSI for current and previous bars
  const rsiCurrent = ctx.rsi(rsiLength, 0);
  const rsiPrevious = ctx.rsi(rsiLength, 1);

  if (rsiCurrent == null || rsiPrevious == null) return null;

  // Define volume threshold multiplier
  // Only enter when current volume is above average volume by this factor
  const volThreshold = 1.5;
  if (currentVolume <= avgVolume * volThreshold) {
    // Return null if volume condition is not met
    return null;
  }

  // Buy condition: RSI crosses below 30 (oversold)
  if (rsiPrevious >= 30 && rsiCurrent < 30) {
    // Enter a long position with full cash
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: RSI crosses above 70 (overbought)
  if (rsiPrevious <= 70 && rsiCurrent > 70) {
    // Close position with a sell order
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
