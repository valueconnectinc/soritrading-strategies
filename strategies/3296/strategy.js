/*
 * @coinsori-strategy v1
 * name: Liquidation-Cascade Contrarian BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * DIAGNOSTIC BUILD 3 — tests whether ctx.binanceLiqs(n) returns data.
 * Trades only when liquidation data is non-null and non-empty.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  const liqs = ctx.binanceLiqs(48);
  const avail = liqs != null && (Array.isArray(liqs) ? liqs.length > 0 : true);

  // Trade only if liquidation data exists — proves availability by trading.
  if (!avail) { ctx.watch([]); return null; }

  const sma100 = ctx.sma(100, 1);
  if (sma100 == null) { ctx.watch([]); return null; }
  const pos = ctx.pos(ctx.sym);
  if (pos > 0) {
    const sma50 = ctx.sma(50, 1);
    if (sma50 != null && price < sma50) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > sma100) return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
  ctx.watch([]);
  return null;
}
