/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion SOL
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 1000
 *
 * Buys when RSI drops below 30 (deeply oversold) and sells when RSI rises above 65 (overbought).
 * Uses a tight stop-loss at -5% from entry to protect capital.
 * Why this strategy: RSI mean reversion is a classic, well-understood edge on crypto which tends
 * to overshoot in both directions. On 1H SOL, RSI oscillates frequently enough to generate 10-20+
 * trades per 500-bar window. Simpler than volume-based triggers which proved too rare.
 * When it does NOT work: Choppy, range-bound chop without a clear directional bias causes
 * whipsaws — RSI keeps crossing 30/65 without follow-through, accumulating small losses.
 */
function onUpdate(ctx) {
  // Warm-up: need 21 bars for RSI(14)
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // --- ENTRY: RSI deeply oversold, no position ---
  if (ctx.position === 0) {
    // Buy when RSI < 30 (deeply oversold)
    if (rsi < 30) {
      // Market buy with ~99% of cash
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // --- EXIT: RSI overbought ---
  if (ctx.position > 0) {
    // Sell when RSI > 65 (overbought / mean reversion target reached)
    if (rsi > 65) {
      return { side: 'sell', qty: ctx.position };
    }
    // Stop-loss: exit if price dropped > 5% from entry
    if (ctx.entryPx > 0 && ctx.price < ctx.entryPx * 0.95) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  return null;
}
