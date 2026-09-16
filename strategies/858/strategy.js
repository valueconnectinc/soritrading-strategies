/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion with Volatility Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy combines RSI mean reversion with a volatility filter to avoid trading during high volatility periods. It enters long when RSI is below 30 and exits when RSI crosses above 70.
 * The strategy buys on oversold conditions but avoids entering during times of high price fluctuation.
 * It may underperform in strong trending markets where the price does not revert to the mean, and could miss significant trends by waiting for volatility to decrease.
 */
function onUpdate(ctx) {
  // === INDICATORS ===
  const rsi = ctx.rsi(14, 0);
  const rsiPrev = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 0);
  const vol = ctx.vol;

  // === GUARD AGAINST NULL VALUES ===
  if (rsi == null || rsiPrev == null || atr == null || vol == null) {
    return null;
  }

  // === VOLATILITY FILTER ===
  // Only trade when volatility is below a threshold (e.g., average volume * 2)
  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;

  if (vol < avgVol * 0.5) {
    // === LONG POSITION LOGIC ===
    // Buy when RSI drops below 30 (oversold condition)
    if (rsiPrev <= 30 && rsi > 30) {
      const qty = ctx.cash / ctx.price * 0.99;
      return {
        side: 'buy',
        qty: qty,
        type: 'market'
      };
    }

    // === EXIT LOGIC ===
    // Sell when RSI crosses above 70 (overbought condition)
    if (rsiPrev <= 70 && rsi > 70) {
      return {
        side: 'sell',
        qty: ctx.position
      };
    }
  }

  return null;
}
