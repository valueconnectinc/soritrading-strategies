/*
 * @coinsori-strategy v1
 * name: MACD + Volume Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses MACD for trend detection and adds a volume filter to confirm trading signals. The idea is to avoid false breakouts or weak trends which might lead to losses.
 * When it buys and sells: It buys when the MACD line crosses above the signal line and the current volume exceeds the average volume. It sells when the MACD line crosses below the signal line.
 * When it does NOT work: This strategy may fail during highly volatile or sideways markets, where MACD signals can be misleading and volume does not effectively confirm the trend.
 */
function onUpdate(ctx) {
  // Get MACD values
  const macd = ctx.macd(12, 26, 9, 0);
  const macd_1 = ctx.macd(12, 26, 9, 1);
  const macd_2 = ctx.macd(12, 26, 9, 2);

  // Get current volume and average volume
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);

  // Guard against null values
  if (macd == null || macd_1 == null || macd_2 == null) return null;

  // Confirm with volume filter
  if (vol < avgVol) return null;

  // Buy condition: MACD crosses above signal line and volume is high
  if (macd_1.macd <= macd_1.signal && macd.macd > macd.signal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: MACD crosses below signal line
  if (macd_1.macd >= macd_1.signal && macd.macd < macd.signal) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
