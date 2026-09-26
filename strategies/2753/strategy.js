/*
 * @coinsori-strategy v1
 * name: Candle-Pattern Panic Reversal BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Diagnostic v3: test whether ctx.closes indexing works by trading on a
 * simple green-close condition that should fire often.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  if (pos > 0) {
    // exit after a few bars to keep it simple
    if (price > ctx.entryPx * 1.02 || ctx.i - (ctx.state.entryBar || 0) > 10) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price < sma200) return null;

  const c1 = ctx.closes[ctx.i - 1];
  const c2 = ctx.closes[ctx.i - 2];
  // green closed bar: current close > previous close
  if (c1 != null && c2 != null && c1 > c2) {
    ctx.state.entryBar = ctx.i;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.5 };
  }
  return null;
}
