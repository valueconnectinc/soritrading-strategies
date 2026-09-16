/*
 * @coinsori-strategy v1
 * name: MACD Crossover with Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy looks for bullish crossovers in MACD indicator and uses volume filter as a confirmation to avoid false signals.
 * When it buys and sells: It buys on a bullish crossover of MACD (when MACD line crosses above signal line) with high volume, and sells when the position is profitable or when a bearish crossover occurs.
 * When it does NOT work: This strategy may fail in a sideways market where there are no clear trends, or when volume is not a reliable indicator.
 */
function onUpdate(ctx) {
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const vol = ctx.vol;
  const volPrev = ctx.volPrev;
  const avgVol = ctx.avgVol(20);

  // Guard against null values
  if (macd == null || macdPrev == null || vol == null || volPrev == null || avgVol == null) {
    return null;
  }

  // Buy condition: MACD crossover + high volume
  const buyCondition = (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal) && (vol > avgVol * 1.2);
  
  // Sell condition: Profitable or bearish crossover
  const sellCondition = (ctx.position > 0 && ctx.uPnl > 0) || (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal);

  // Execute orders based on conditions
  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (sellCondition) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
