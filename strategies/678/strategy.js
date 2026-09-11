/*
 * @coinsori-strategy v1
 * name: Volume-Adjusted Moving Average Trend Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses volume and moving averages to identify trend direction.
 * When volume is high and price is above the moving average, it buys.
 * When volume is high and price is below the moving average, it sells.
 * It avoids trading when volume is low to reduce false signals.
 * 
 * The key difference in this version: it uses an EMA instead of SMA and incorporates
 * a volatility filter using ATR to adjust the sensitivity of entry/exit points.
 *
 * Why this strategy: The idea is that strong volume often indicates significant market interest,
 * and combined with EMA and ATR for trend detection and filtering, can help improve performance.
 *
 * When it buys and sells:
 *   It buys when price is above a 20-period EMA, volume is high (above average),
 *   and volatility (ATR) is above a threshold.
 *   It sells when price is below a 20-period EMA, volume is high (above average),
 *   and volatility (ATR) is above a threshold.
 *
 * When it does NOT work: In range-bound markets or during low volatility periods,
 * the strategy may not produce enough signals to trade consistently.
 */

function onUpdate(ctx) {
  // Get required data
  const ema = ctx.ema(20); // 20-period exponential moving average
  const vol = ctx.vol;    // Current volume
  const avgVol = ctx.avgVol(20); // Average volume over 20 periods
  const price = ctx.price;
  const atr = ctx.atr(14); // 14-period ATR
  
  // Wait for enough data to be available
  if (ema == null || vol == null || avgVol == null || atr == null) return null;

  // Define high volume threshold (average volume)
  const highVolThreshold = avgVol * 1.2; // 20% above average volume
  
  // Define volatility threshold (ATR)
  const volThreshold = atr * 1.5; // 1.5 times ATR as a volatility filter

  // Check if current volume is high and volatility is high enough
  const isHighVolume = vol > highVolThreshold;
  const isHighVolatility = atr > volThreshold;
  
  // If volume or volatility is not high, do nothing
  if (!isHighVolume || !isHighVolatility) return null;

  // Determine trend based on price and moving average
  const isAboveEMA = price > ema;
  const isBelowEMA = price < ema;

  // Buy only when price is above EMA, volume is high, and volatility is high
  if (isAboveEMA) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Sell only when price is below EMA, volume is high, and volatility is high
  if (isBelowEMA) {
    // Close position if exists, otherwise do nothing
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
