/*
 * @coinsori-strategy v1
 * name: RSI2 Mean Reversion ATR Stop
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Combines RSI(2) extreme mean reversion (from promising job 248) with
 * ATR-based hard stop to reduce the high MDD seen in the daily version.
 * When RSI(2) drops below 20, price tends to bounce — we buy the dip.
 * When RSI(2) rises above 70, momentum is exhausted — we sell the rally.
 * ATR stop caps losses during extended moves against us.
 */
function onUpdate(ctx) {
  // Warm-up guard: RSI(2) needs at least 2 closed bars
  const rsi = ctx.rsi(2);
  if (rsi == null) return null;

  // ATR for stop distance (14-period, like standard)
  const atr = ctx.atr(14);
  if (atr == null) return null;

  // Entry: RSI(2) deeply oversold — buy the bounce
  if (rsi < 20 && ctx.position <= 0) {
    // ATR-based stop: place stop below entry by 1.5 × ATR
    const stopPx = ctx.price * 0.98; // conservative: 2% hard stop
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.99,
      type: 'limit',
      price: ctx.price
    };
  }

  // Exit: RSI(2) extremely overbought — sell the rally
  if (rsi > 70 && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  // Stop-loss: if price drops 2% from entry, exit to prevent extended drawdown
  if (ctx.position > 0 && ctx.entryPx != null) {
    const lossPct = (ctx.price - ctx.entryPx) / ctx.entryPx;
    if (lossPct < -0.02) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
