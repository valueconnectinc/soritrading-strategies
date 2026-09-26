/*
 * @coinsori-strategy v1
 * name: Candle-Pattern Panic Reversal BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Diagnostic v7: test several high/low parameter forms.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (ctx.i - (ctx.state.entryBar || 0) > 5) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const h20_0 = ctx.high(20, 0);
  const l20_0 = ctx.low(20, 0);
  const h20_1 = ctx.high(20, 1);
  const l20_1 = ctx.low(20, 1);

  // buy if the 20-bar high/low at ago=1 are non-null
  if (h20_1 != null && l20_1 != null && h20_1 > l20_1) {
    ctx.state.entryBar = ctx.i;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.5 };
  }
  return null;
}
