/*
 * @coinsori-strategy v1
 * name: Candle-Pattern Panic Reversal BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Diagnostic v5: test ctx.high/ctx.low with ago directly.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const h1 = ctx.high(1, 1);
  const l1 = ctx.low(1, 1);
  const h2 = ctx.high(1, 2);
  const l2 = ctx.low(1, 2);
  const c1 = ctx.closes[ctx.i - 1];

  if (pos > 0) {
    if (price > ctx.entryPx * 1.03 || ctx.i - (ctx.state.entryBar || 0) > 8) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // buy whenever h1/l1/h2/l2 are all non-null and h1>l1 (should fire ~every bar)
  if (h1 != null && l1 != null && h2 != null && l2 != null && h1 > l1) {
    ctx.state.entryBar = ctx.i;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.5 };
  }
  return null;
}
