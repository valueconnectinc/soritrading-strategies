/*
 * @coinsori-strategy v1
 * name: MACD Crossover with Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses a MACD crossover signal as the primary entry point, but adds a volume filter to confirm the strength of the move. By filtering out low-volume trades, it aims to reduce false signals and improve the reliability of entries.
 * When it buys and sells: Buys when MACD line crosses above signal line and volume is above average. Sells when MACD line crosses below signal line.
 * When it does NOT work: This strategy may not perform well in low-volume markets or during periods of market uncertainty where volume data is unreliable.
 */

function onUpdate(ctx) {
  // Calculate indicators
  const macd = ctx.macd(12, 26, 9);
  const vol = ctx.vol;

  // Guard against null values
  if (macd == null || vol == null) return null;

  // Calculate average volume over the last 5 periods
  const avgVol = ctx.avgVol(5);
  
  // Guard against null average volume
  if (avgVol == null) return null;

  // Buy condition: MACD crossover with volume confirmation
  if (macd.macd > macd.signal && vol > avgVol) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: MACD crossover
  if (macd.macd < macd.signal) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
