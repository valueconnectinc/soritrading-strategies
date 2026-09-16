/*
 * @coinsori-strategy v1
 * name: Multi-Condition Entry Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines multiple technical indicators to create a more robust entry signal. It uses RSI, MACD, and volume filters to confirm the strength of a potential trend change.
 * When it buys and sells: The strategy buys when RSI is below 30 (oversold) and MACD line crosses above the signal line, with increased volume confirming the trend. It sells when RSI is above 70 (overbought) and MACD line crosses below the signal line.
 * When it does NOT work: This strategy may fail during strong trending markets where momentum is strong and volume does not confirm reversals, or in low volatility environments where volume filters don't trigger effectively.
 */
function onUpdate(ctx) {
  // Get indicators
  const rsi = ctx.rsi(14);
  const macd = ctx.macd(12, 26, 9);
  
  // Volume filter
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  
  // Guard against null values
  if (rsi == null || macd == null || macd.macd == null || macd.signal == null || vol == null || avgVol == null) {
    return null;
  }
  
  // Previous bar indicators
  const rsiPrev = ctx.rsi(14, 1);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const volPrev = ctx.volPrev;
  
  if (rsiPrev == null || macdPrev == null || macdPrev.macd == null || macdPrev.signal == null) {
    return null;
  }
  
  // Buy condition
  // RSI is in oversold region, MACD line crosses above signal line, and volume increases
  const buyCondition = (rsi < 30 && rsiPrev >= 30 && 
                        macd.macd > macd.signal && macdPrev.macd <= macdPrev.signal &&
                        vol > avgVol * 1.2);
  
  // Sell condition  
  // RSI is in overbought region, MACD line crosses below signal line, and volume increases
  const sellCondition = (rsi > 70 && rsiPrev <= 70 && 
                         macd.macd < macd.signal && macdPrev.macd >= macdPrev.signal &&
                         vol > avgVol * 1.2);
  
  // Execute orders  
  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (sellCondition && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
