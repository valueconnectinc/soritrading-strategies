/*
 * @coinsori-strategy v1
 * name: MACD RSI Trend Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses MACD and RSI indicators to identify trend changes and overbought/oversold conditions. It aims to capture momentum shifts in the market.
 * When it buys and sells: The strategy buys when MACD crosses above its signal line and RSI is below 50, indicating a potential bullish trend. It sells when MACD crosses below its signal line and RSI is above 50, indicating a bearish trend.
 * When it does NOT work: This strategy may fail in ranging markets where trend changes are infrequent, or during strong trending periods where the indicators give false signals.
 */

function onUpdate(ctx) {
  // Get indicator values
  const macd = ctx.macd(12, 26, 9);
  const rsi = ctx.rsi(14);
  
  // Guard against null values
  if (macd == null || rsi == null || macd.signal == null) return null;
  
  // Buy condition: MACD crosses above signal line AND RSI is below 50
  if (macd.macd > macd.signal && rsi < 50) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: MACD crosses below signal line AND RSI is above 50
  if (macd.macd < macd.signal && rsi > 50) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // Do nothing
  return null;
}
