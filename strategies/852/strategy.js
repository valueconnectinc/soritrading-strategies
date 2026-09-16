/*
 * @coinsori-strategy v1
 * name: MACD Trend Following with Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy aims to capture long-term trends using MACD, while filtering out low-volume periods that may indicate unreliable signals.
 * When it buys and sells: It buys when the MACD line crosses above the signal line and volume is above average. It sells when the MACD line crosses below the signal line.
 * When it does NOT work: This strategy performs poorly in ranging markets where there are no clear trends, or during low-volume periods that may mislead the signal.
 */

function onUpdate(ctx) {
  // === INDICATORS ===
  
  // Calculate MACD with standard parameters (12, 26, 9)
  const macdLine = ctx.macd(12, 26, 9, 1);
  const signalLine = ctx.macd(12, 26, 9, 2);

  // Volume indicators
  const currentVolume = ctx.vol;
  const avgVolume = ctx.avgVol(20); // Average volume over last 20 bars

  // === SAFETY GUARDS ===
  
  // Only proceed if indicators have enough data
  if (macdLine == null || signalLine == null || currentVolume == null || avgVolume == null) return null;

  // === LOGIC ===
  
  // Check if MACD line crossed above the signal line (bullish crossover)
  const isBullishCrossover = macdLine < signalLine && ctx.macd(12, 26, 9, 2).macd > ctx.macd(12, 26, 9, 3).macd;
  
  // Check if MACD line crossed below the signal line (bearish crossover)
  const isBearishCrossover = macdLine > signalLine && ctx.macd(12, 26, 9, 2).macd < ctx.macd(12, 26, 9, 3).macd;
  
  // Volume filter
  const volumeAboveAverage = currentVolume > avgVolume;

  // === TRADE EXECUTION ===
  
  if (isBullishCrossover && volumeAboveAverage) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (isBearishCrossover) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // No action
  return null;
}
