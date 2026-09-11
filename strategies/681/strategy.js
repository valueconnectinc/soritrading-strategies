/*
 * @coinsori-strategy v1
 * name: Enhanced MACD-RSI Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: The strategy combines MACD and RSI to capture momentum shifts with a focus on avoiding false signals. It uses RSI values to filter MACD crossovers, allowing only those where the market is not overbought or oversold.
 * When it buys and sells: It buys when MACD line crosses above signal line and RSI is below 70 (not overbought) and sells when MACD line crosses below signal line and RSI is above 30 (not oversold).
 * When it does NOT work: This strategy fails during ranging markets or in strongly trending conditions where momentum reversals are rare. It may also underperform during periods of high volatility with frequent false signals.
 */
function onUpdate(ctx) {
  // Get MACD values
  const macd = ctx.macd(12, 26, 9, 0);
  const macd_prev = ctx.macd(12, 26, 9, 1);
  const rsi = ctx.rsi(14, 0);
  const rsi_prev = ctx.rsi(14, 1);

  // Check for valid MACD and RSI values
  if (macd == null || macd_prev == null || rsi == null || rsi_prev == null) {
    return null;
  }

  // Buy condition: MACD line crosses above signal line AND RSI is not overbought
  const buyCondition = (macd.macd > macd.signal) && (macd_prev.macd <= macd_prev.signal) && (rsi < 70);

  // Sell condition: MACD line crosses below signal line AND RSI is not oversold
  const sellCondition = (macd.macd < macd.signal) && (macd_prev.macd >= macd_prev.signal) && (rsi > 30);

  // Execute buy or sell orders based on conditions
  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (sellCondition) {
    return { side: 'sell', qty: ctx.position };
  }

  // Return null if no condition is met
  return null;
}
