/*
 * @coinsori-strategy v1
 * name: RSI-Based Strategy with External Data
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy uses external RSI data from a database to guide entry signals, 
 * helping to avoid buying at overbought or selling at oversold conditions.
 * When it buys and sells: It buys when the external RSI is below 30 (oversold) and sells when above 70 (overbought).
 * When it does NOT work: The strategy may fail in a strong trending market where RSI does not give meaningful signals.
 */

function onUpdate(ctx) {
  // Reading data from external dataset
  const rsiData = ctx.data('fear_greed_index');
  
  // Guard clause for external data
  if (rsiData == null) return null;
  
  // Define thresholds for RSI
  const oversold = 30;
  const overbought = 70;
  
  // Get current RSI value
  const rsi = rsiData;
  
  // Buy condition: RSI below oversold threshold
  if (rsi < oversold && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: RSI above overbought threshold
  if (rsi > overbought && ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
