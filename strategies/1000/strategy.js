/*
 * @coinsori-strategy v1
 * name: MACD RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines MACD and RSI to identify mean-reversion opportunities. It uses the MACD crossover to determine trend direction, while the RSI acts as a momentum filter to avoid false signals.
 * When it buys and sells: The strategy buys when the MACD line crosses above the signal line and the RSI is below 30 (oversold), indicating a potential mean-reversion. It sells when the MACD line crosses below the signal line and the RSI is above 70 (overbought).
 * When it does NOT work: This strategy may underperform in strong trending markets where momentum persists, and it might miss significant opportunities if RSI and MACD signals do not align.
 */

function onUpdate(ctx) {
  // Get indicators
  const macd = ctx.macd(12, 26, 9, 0);
  const macd_prev = ctx.macd(12, 26, 9, 1);
  const rsi = ctx.rsi(14, 0);
  const rsi_prev = ctx.rsi(14, 1);

  // Ensure we have enough data
  if (macd == null || macd_prev == null || rsi == null || rsi_prev == null) {
    return null;
  }

  // BUY condition: MACD crosses above signal line AND RSI is below 30
  if (macd_prev.macd <= macd_prev.signal && macd.macd > macd.signal && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL condition: MACD crosses below signal line AND RSI is above 70
  if (macd_prev.macd >= macd_prev.signal && macd.macd < macd.signal && rsi > 70) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
