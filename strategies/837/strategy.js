/*
 * @coinsori-strategy v1
 * name: MACD Crossover with Volume Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: This strategy uses the MACD crossover signal combined with a volume filter to identify strong trend movements. When the MACD line crosses above the signal line and the volume is significantly higher than average, it signals a buy opportunity.
 * When it buys and sells: It buys when the MACD line crosses above the signal line and volume is high. It sells when the MACD line crosses below the signal line as a mean reversion signal.
 * When it does NOT work: This strategy may fail in ranging markets or during low-volume periods where MACD signals are unreliable. It also doesn't account for sudden market shocks or news events that can rapidly change trends.
 */

function onUpdate(ctx) {
  // Get MACD values
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  
  // Guard against null values
  if (macd == null || macdPrev == null || macd.signal == null || macdPrev.signal == null) {
    return null;
  }

  // Get volume data - we need at least 20 bars for average volume to be meaningful
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  
  if (vol == null || avgVol == null) {
    return null;
  }
  
  // Simple volume filter: Only trade if current volume is 1.5x or higher than the average volume
  const volumeCondition = vol >= avgVol * 1.5;

  // Check MACD crossover - buy when MACD crosses above signal line
  const buyCondition = (macdPrev.signal >= macdPrev.macd) && (macd.signal < macd.macd);
  
  // Sell condition - when MACD crosses below signal line as a mean reversion trigger
  const sellCondition = (macdPrev.signal <= macdPrev.macd) && (macd.signal > macd.macd);

  // Entry logic
  if (buyCondition && volumeCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  if (sellCondition) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
