/*
 * @coinsori-strategy v1
 * name: MACD Crossover with RSI Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines MACD crossover with an RSI filter to reduce false signals. It aims to identify stronger trend changes while filtering out minor fluctuations that may lead to losses.
 * When it buys and sells: It buys when the MACD line crosses above the signal line and RSI is above 50, and sells when MACD crosses below the signal line and RSI is below 50.
 * When it does NOT work: This strategy might underperform in a strong ranging market where neither MACD nor RSI shows clear signals for trend changes.
 */

function onUpdate(ctx) {
  // Calculate MACD and RSI
  const macd = ctx.macd(12, 26, 9);
  const rsi = ctx.rsi(14);

  // Wait for both indicators to be calculated
  if (macd == null || rsi == null || macd.macd == null || macd.signal == null) return null;

  // Buy when MACD crosses above signal and RSI is above 50
  if (macd.macd > macd.signal && rsi > 50 && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell when MACD crosses below signal and RSI is below 50
  if (macd.macd < macd.signal && rsi < 50 && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action needed
  return null;
}
