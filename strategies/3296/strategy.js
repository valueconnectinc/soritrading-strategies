/*
 * @coinsori-strategy v1
 * name: DXY Macro-Regime Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * DIAGNOSTIC BUILD 2 — trades only when ctx.macro('dxy') is non-null.
 * If this trades, macro is available; if it never trades, macro is null.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  const dxy = ctx.macro('dxy');

  // Trade ONLY if macro is available — proves availability by trading.
  if (dxy == null || !Number.isFinite(dxy)) { ctx.watch([]); return null; }

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
