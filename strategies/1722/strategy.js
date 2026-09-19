/*
 * @coinsori-strategy v1
 * name: RSI MR with SMA200 Trend Filter
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 1000
 *
 * Buys when RSI < 30 AND price is above its 200-bar SMA (confirmed uptrend or recovery).
 * Sells when RSI > 65 or when price crosses below SMA200 (trend breakdown).
 * Stop-loss at -5% from entry for capital protection.
 * Why this strategy: RSI-only mean reversion had too many losing trades — adding SMA200
 * filter prevents buying into sustained downtrends where mean reversion fails.
 * When it does NOT work: In strong bull markets RSI rarely drops below 30, so the
 * strategy sits out most of the rally and misses upside.
 */
function onUpdate(ctx) {
  // Warm-up: need 200 bars for SMA200 + 14 for RSI
  const rsi = ctx.rsi(14);
  const sma200 = ctx.sma(200);
  if (rsi == null || sma200 == null) return null;

  const price = ctx.price;

  // --- ENTRY: RSI oversold + price above SMA200 (bullish alignment) ---
  if (ctx.position === 0) {
    if (rsi < 30 && price > sma200) {
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  // --- EXIT: RSI overbought OR trend breakdown ---
  if (ctx.position > 0) {
    // Exit on RSI overbought
    if (rsi > 65) {
      return { side: 'sell', qty: ctx.position };
    }
    // Exit on trend breakdown (price crosses below SMA200)
    if (price < sma200) {
      return { side: 'sell', qty: ctx.position };
    }
    // Stop-loss at -5%
    if (ctx.entryPx > 0 && price < ctx.entryPx * 0.95) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  return null;
}
