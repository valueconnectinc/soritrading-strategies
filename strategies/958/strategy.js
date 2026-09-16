/*
 * @coinsori-strategy v1
 * name: MACD RSI Combination Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Combines the trend-following strength of MACD with the mean-reversion signal of RSI to create a balanced approach that adapts to changing market conditions. It aims to enter trades when both indicators support the same direction, reducing false signals.
 * When it buys and sells: Buys when MACD line crosses above signal line AND RSI is below 30 (oversold), and sells when MACD line crosses below signal line AND RSI is above 70 (overbought).
 * When it does NOT work: This strategy may underperform in ranging markets where neither the trend nor the momentum is clear, leading to missed opportunities or unnecessary trades.
 */
function onUpdate(ctx) {
  // Get required indicators
  const macd = ctx.macd(12, 26, 9);
  const rsi = ctx.rsi(14);
  
  // Guard against null values (warm-up period)
  if (macd == null || rsi == null || macd.macd == null || macd.signal == null) {
    return null;
  }
  
  // Define entry conditions
  const buyCondition = macd.macd > macd.signal && rsi < 30;
  const sellCondition = macd.macd < macd.signal && rsi > 70;
  
  // Additional filter: Only enter if there's a clear trend (e.g., price above 20-day SMA)
  const sma20 = ctx.sma(20);
  if (sma20 == null) return null;
  const trendFilter = ctx.price > sma20;  
  
  // Entry logic
  if (buyCondition && trendFilter && ctx.position <= 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  if (sellCondition && !trendFilter && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // No action
  return null;
}
