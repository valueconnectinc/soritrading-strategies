/*
 * @coinsori-strategy v1
 * name: RSI Only Diagnostic — BTCUSDT 1H
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Diagnostic strategy: pure RSI mean reversion with no EMA dependency.
 * RSI(7) crosses below 30 = buy. RSI crosses above 60 = sell.
 * Minimal warm-up (7 bars) so it should fire signals quickly.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(7);
  if (rsi == null) return null;

  const position = ctx.position;
  const price    = ctx.price;

  if (!position) {
    const rsiPrev = ctx.rsi(7, 1);
    if (rsiPrev == null) return null;
    // Buy when RSI crosses up from oversold territory
    if (rsiPrev <= 30 && rsi > 30) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  } else {
    const rsiPrev = ctx.rsi(7, 1);
    if (rsiPrev == null) return null;
    // Sell when RSI crosses above 60
    if (rsiPrev <= 60 && rsi > 60) {
      return { side: 'sell', qty: position };
    }
  }
  return null;
}
