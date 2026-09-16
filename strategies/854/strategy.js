/*
 * @coinsori-strategy v1
 * name: Mean Reversion with RSI and Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy attempts to capture mean-reverting behavior in Bitcoin by using RSI overbought/oversold signals combined with a volume filter. It assumes that strong price movements are often followed by retracements.
 * When it buys and sells: The strategy buys when RSI falls below 30 (oversold) and volume exceeds a threshold, and sells when RSI rises above 70 (overbought) with high volume.
 * When it does NOT work: This strategy may fail during strong trending markets where price continues to move in the initial direction without retracing, leading to frequent false signals or whipsaws.
 */

function onUpdate(ctx) {
  // Get indicators
  const rsi = ctx.rsi(14);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  
  // Guard against null values
  if (rsi == null || vol == null || avgVol == null) return null;

  // Define RSI thresholds for mean reversion
  const oversold = 30;   // RSI가 이 값 아래로 내려가면 매수 신호
  const overbought = 70; // RSI가 이 값 위로 올라가면 매도 신호
  
  // Volume filter: only trade if volume is above average
  const volThreshold = avgVol * 1.2; // 20% above average volume

  // Check for buy signal (oversold + high volume)
  if (rsi <= oversold && vol >= volThreshold) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Check for sell signal (overbought + high volume)
  if (rsi >= overbought && vol >= volThreshold) {
    // Only sell if we have a position
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
