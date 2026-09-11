/*
 * @coinsori-strategy v1
 * name: MACD Crossover with Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The MACD crossover strategy is a classic momentum-based approach that capitalizes on trend changes.
 * When it buys and sells: It buys when the MACD line crosses above the signal line, and sells when it crosses below — filtered by volume to avoid low-liquidity moves.
 * When it does NOT work: This strategy may fail in ranging markets where there are no clear trends or during major news events that cause sudden price swings not captured by MACD.
 */
function onUpdate(ctx) {
  // Check for warm-up
  if (ctx.i < 26) return null;

  // Calculate MACD values (12, 26, 9 period)
  const macd = ctx.macd(12, 26, 9, 0);
  const macdSignal = ctx.macd(12, 26, 9, 1);  // Previous bar's MACD signal

  if (macd == null || macdSignal == null) return null;

  // Volume filter - only trade if volume is above average
  const avgVol = ctx.avgVol(20);
  if (avgVol == null || ctx.vol < avgVol * 1.5) return null;

  // Buy signal: MACD crosses above signal line
  if (macdSignal <= macd && ctx.macd(12, 26, 9, 2).signal > ctx.macd(12, 26, 9, 1).signal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell signal: MACD crosses below signal line
  if (macdSignal >= macd && ctx.macd(12, 26, 9, 2).signal < ctx.macd(12, 26, 9, 1).signal) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
