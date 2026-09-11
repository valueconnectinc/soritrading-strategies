/*
 * @coinsori-strategy v1
 * name: MACD Crossover with Volume Filter
 * ex: binanceusdm
 * syms: BNBUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy uses a MACD crossover as the main signal to enter trades, but adds a volume filter to ensure that only significant moves are taken. It's designed for momentum trades where strong volume confirms price action.
 * When it buys and sells: It buys when the MACD line crosses above the signal line (bullish crossover), with volume filtering enabled. It sells when the MACD line crosses below the signal line, closing any open position.
 * When it does NOT work: This strategy may not perform well in low-volume or sideways markets where MACD crossovers are frequent but lack conviction. It also does not account for trends that may be short-lived. It relies heavily on MACD’s ability to detect momentum and may miss longer-term directional movements.
 */
function onUpdate(ctx) {
  // === INPUTS ===
  const fast = 12;
  const slow = 26;
  const signal = 9;
  const volRatio = 1.5; // Volume threshold multiplier

  // === INDICATORS ===
  const macd = ctx.macd(fast, slow, signal, 0);
  const macdPrev = ctx.macd(fast, slow, signal, 1); // Previous MACD values
  const avgVol = ctx.avgVol(20); // Average volume over 20 periods

  if (macd == null || macdPrev == null || avgVol == null) return null;

  // === VOLUME FILTER ===
  // Only trade when volume is above average * volRatio
  if (ctx.vol < avgVol * volRatio) return null;

  // === BUY SIGNAL ===
  // Bullish crossover: MACD crosses above signal line
  if (macdPrev == null || macdPrev.macd == null || macdPrev.signal == null ||
      macd.macd == null || macd.signal == null) return null;

  if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // === SELL SIGNAL ===
  // Bearish crossover: MACD crosses below signal line
  if (ctx.position > 0 && macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
