/*
 * @coinsori-strategy v1
 * name: BTC MACD Crossover Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The MACD crossover is a widely used technical indicator that can help identify potential trend reversals. This strategy uses the MACD line crossing above or below the signal line as entry signals.
 * When it buys and sells: It buys when the MACD line crosses above the signal line, and sell when it crosses below.
 * When it does NOT work: This strategy may not perform well in ranging markets where the MACD does not produce strong crossovers or during strong trending periods where early crossovers may lead to premature exits.
 */
function onUpdate(ctx) {
  // Calculate MACD indicators
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);

  // Ensure we have valid data before proceeding
  if (macd == null || macdPrev == null) return null;

  // Check for crossover conditions
  const macdLine = macd.macd;
  const signalLine = macd.signal;
  const macdLinePrev = macdPrev.macd;
  const signalLinePrev = macdPrev.signal;

  // Buy condition: MACD line crosses above signal line
  if (macdLinePrev <= signalLinePrev && macdLine > signalLine && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }

  // Sell condition: MACD line crosses below signal line
  if (macdLinePrev >= signalLinePrev && macdLine < signalLine && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action otherwise
  return null;
}
