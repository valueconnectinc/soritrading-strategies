/*
 * @coinsori-strategy v1
 * name: RSI + MACD Strategy with External Data
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Combines RSI from external data with MACD for better entry signals. 
 * This improves the accuracy of trade entries by using multiple indicators.
 * When it buys and sells: Buys when RSI is below 30 and MACD crosses above signal line. Sells when RSI is above 70 and MACD crosses below signal line.
 * When it does NOT work: The strategy may fail in choppy or ranging markets where the MACD doesn't provide clear signals, or if RSI data is not representative.
 */

function onUpdate(ctx) {
  // Reading data from external dataset
  const rsiData = ctx.data('fear_greed_index');
  
  // Guard clause for external data
  if (rsiData == null) return null;
  
  // Calculate MACD indicators
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const macdSignal = macd ? macd.signal : null;
  const macdSignalPrev = macdPrev ? macdPrev.signal : null;
  
  // Guard clause for MACD
  if (macd == null || macdSignal == null || macdPrev == null || macdSignalPrev == null) return null;
  
  // Define thresholds for RSI
  const oversold = 30;
  const overbought = 70;
  
  // Get current RSI value
  const rsi = rsiData;
  
  // Buy condition: RSI below oversold and MACD crosses above signal line
  if (rsi < oversold && macdPrev.macd <= macdSignalPrev && macd.macd > macdSignal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: RSI above overbought and MACD crosses below signal line
  if (rsi > overbought && macdPrev.macd >= macdSignalPrev && macd.macd < macdSignal) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
