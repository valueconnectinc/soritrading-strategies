/*
 * @coinsori-strategy v1
 * name: MACD and RSI Trend Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy uses MACD and RSI to identify trend changes and potential entry points. It aims to capture upward trends when both MACD and RSI are bullish, and avoid strong downtrends.
 * When it buys and sells: The strategy buys when MACD crossover occurs and RSI is above 50, and sells when MACD crossover occurs and RSI is below 50.
 * When it does NOT work: This strategy may underperform in ranging markets or during high volatility periods where trend signals are unclear.
 */

function onUpdate(ctx) {
  // Get MACD values
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  
  // Get RSI value
  const rsi = ctx.rsi(14, 0);
  
  // Check if all values are available
  if (macd == null || macdPrev == null || rsi == null) return null;

  // Buy condition: MACD line crosses above signal line and RSI is above 50
  const buyCondition = (macdPrev.macd <= macdPrev.signal) && (macd.macd > macd.signal) && (rsi > 50);
  
  // Sell condition: MACD line crosses below signal line and RSI is below 50
  const sellCondition = (macdPrev.macd >= macdPrev.signal) && (macd.macd < macd.signal) && (rsi < 50);

  // If position is zero, and buy condition is met, then buy
  if (ctx.position === 0 && buyCondition) {
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.99
    };
  }
  
  // If position is greater than zero, and sell condition is met, then sell
  if (ctx.position > 0 && sellCondition) {
    return {
      side: 'sell',
      qty: ctx.position
    };
  }

  // No action needed
  return null;
}
