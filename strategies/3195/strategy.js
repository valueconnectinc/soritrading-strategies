/*
 * @coinsori-strategy v1
 * name: BTC 1D RSI2 Extreme-Oversold Bounce
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * BTC's sharpest declines are followed by sharp recoveries (V-bottoms). RSI(2) near
 * zero flags an extreme one-day oversold condition that historically bounces within
 * days. Buy the oversold, sell the bounce.
 * When it does NOT work: in a real bear market the bounce is weak or absent and the
 * 2x ATR stop cuts the loss; in a low-volatility drift RSI(2) rarely goes below 5 so
 * it sits in cash. It also never catches the big trend moves — it is a scalper on 1D.
 */

function onUpdate(ctx) {
  const rsi2 = ctx.rsi(2, 1);
  const rsi14 = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const price = ctx.price;
  if (rsi2 == null || rsi14 == null || atr == null) return null;

  if (ctx.position > 0) {
    ctx.watch([{ side: 'sell', price: ctx.entryPx - 2 * atr, note: 'stop' }]);
    // Bounce done when RSI(2) recovers above 50, or RSI(14) is overbought.
    if (rsi2 > 50 || rsi14 > 70) return { side: 'sell', qty: ctx.position };
    if (price <= ctx.entryPx - 2 * atr) return { side: 'sell', qty: ctx.position };
    return null;
  }

  // RSI(2) below 5 = extreme one-day panic; historically a short-lived bounce follows.
  if (rsi2 < 5) {
    return { side: 'buy', qty: ctx.cash / price * 0.98 };
  }
  return null;
}
