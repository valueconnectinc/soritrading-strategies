/*
 * @coinsori-strategy v1
 * name: RSI Crossover with Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the RSI indicator to identify overbought/oversold conditions and applies a volume filter to confirm the strength of the signal. It aims to capture momentum reversals when price is in extreme RSI territory, avoiding false signals during low-volume sessions.
 * When it buys and sells: The strategy enters a long position when RSI crosses above 50 (bullish crossover) with high volume. It exits the position when RSI falls below 50 or when there's a bearish crossover (RSI crossing below 50).
 * When it does NOT work: This strategy may underperform during extremely volatile or sideways markets where RSI signals are unreliable, especially if volume filters are too strict and eliminate valid trades.
 */

function onUpdate(ctx) {
  // === INDICATORS ===
  const rsi = ctx.rsi(14, 0);
  const rsiPrev = ctx.rsi(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);

  // === GUARD AGAINST NULL VALUES ===
  if (rsi == null || rsiPrev == null || vol == null || avgVol == null) return null;

  // === VOLUME FILTER: Only trade when volume is above average ===
  const volumeFilter = vol > avgVol * 1.2; // 20% above average volume

  // === EXIT SIGNALS ===
  const exitSignal = rsi < 50 || (rsiPrev >= 50 && rsi < 50); // Exit if RSI crosses back below 50 or is below 50

  // === ENTRY SIGNALS ===
  const entrySignal = rsiPrev <= 50 && rsi > 50; // Enter long when RSI crosses above 50 (bullish crossover)

  // === POSITION LOGIC ===
  if (ctx.position > 0) {
    // Already in a position, check exit conditions
    if (exitSignal) {
      return { side: 'sell', qty: ctx.position }; // Close position
    }
    return null; // No action
  } else {
    // No open position, check entry conditions
    if (entrySignal && volumeFilter) {
      // Buy only if volume is above threshold
      const qty = ctx.cash / ctx.price * 0.99;
      return { side: 'buy', qty: qty };
    }
    return null; // No action
  }
}
