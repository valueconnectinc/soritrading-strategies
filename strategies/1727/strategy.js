/*
 * @coinsori-strategy v1
 * name: SMA Cross Minimal SOL
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Minimal SMA(5,20) crossover — no state, no candle, no close().
 * Pure ctx indicators only. Tests whether the engine fires any signals.
 * Short-term cross on a volatile asset; whipsaws in sideways markets.
 */
function onUpdate(ctx) {
  const sma5  = ctx.sma(5);
  const sma5p = ctx.sma(5,  1);
  const sma20 = ctx.sma(20);
  const sma20p= ctx.sma(20, 1);

  if (sma5 == null || sma5p == null || sma20 == null || sma20p == null) return null;

  // Golden cross: sma5 crosses above sma20
  if (sma5p <= sma20p && sma5 > sma20) {
    if (ctx.position <= 0) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }
  }

  // Death cross: sma5 crosses below sma20
  if (sma5p > sma20p && sma5 < sma20) {
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
