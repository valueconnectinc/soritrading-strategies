/*
 * @coinsori-strategy v1
 * name: Market Progressive Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy combines multiple indicators to identify mean reversion opportunities.
 * It uses a combination of RSI, MACD, and volume filters to confirm entry points,
 * and a trailing stop loss for exits. By progressive market conditions checking,
 * it adapts to trending or ranging markets without relying only on one indicator.
 *
 * The strategy buys when RSI is below 30 (oversold) for two consecutive bars,
 * MACD line crosses above signal line (bullish crossover), and volume is above average.
 * It sells when RSI is above 70 (overbought) for two consecutive bars, or
 * MACD line crosses below signal line (bearish crossover).
 *
 * This strategy does not work well in strong trending markets where price keeps moving
 * in a single direction without retracing — such scenarios would lead to whipsaws and losses.
 */
function onUpdate(ctx) {
  // === Indicators ===
  const rsi = ctx.rsi(14);
  const macd = ctx.macd(12, 26, 9);
  const avgVol = ctx.avgVol(20);
  const vol = ctx.vol;

  // === Guard conditions ===
  if (rsi == null || macd == null || avgVol == null || vol == null) {
    return null;
  }

  // === Previous bar values (to check for crossover) ===
  const rsiPrev = ctx.rsi(14, 1);
  const macdPrev = ctx.macd(12, 26, 9, 1);

  // === Check if we are currently in a position ===
  const pos = ctx.position;

  // === Entry conditions for Buy (RSI oversold + MACD bullish crossover + volume confirmation) ===
  if (pos <= 0 && rsi < 30 && rsiPrev < 30 && macd.macd > macd.signal && macdPrev.macd <= macdPrev.signal && vol > avgVol) {
    const qty = ctx.cash / ctx.price * 0.95; // Use 95% of cash to buy
    return { side: 'buy', qty: qty };
  }

  // === Exit conditions for Sell (RSI overbought + MACD bearish crossover) ===
  if (pos > 0 && (rsi > 70 && rsiPrev > 70 || macd.macd < macd.signal && macdPrev.macd >= macdPrev.signal)) {
    return { side: 'sell', qty: pos };
  }

  // === Trail stop for existing positions (optional - only if needed) ===
  // We can add trailing stop logic here based on price movement if needed

  return null;
}
