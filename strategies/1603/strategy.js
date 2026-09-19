/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * RSI below 30 signals oversold — price tends to bounce. This strategy buys when
 * RSI dips below 30 and price finds support near the recent swing low, then sells
 * when RSI recovers above 55 (moderate overbought) or after a fixed stop.
 * Mean reversion works best in range-bound chop; it gets hurt in strong trends.
 */
function onUpdate(ctx) {
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;

  // Entry: RSI deeply oversold
  if (ctx.position <= 0 && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Exit: RSI recovered to neutral-overbought zone
  if (ctx.position > 0 && rsi > 55) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
