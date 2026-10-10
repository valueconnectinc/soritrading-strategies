/*
 * @coinsori-strategy v1
 * name: DXY Macro-Regime Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * DIAGNOSTIC BUILD — logs macro availability. Temporary.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  const dxy = ctx.macro('dxy');
  const ms = ctx.macroSeries;
  if (ctx.i < 5) {
    ctx.log('i=' + ctx.i + ' dxy=' + dxy + ' macroSeries=' + JSON.stringify(ms));
  }

  // Diagnostic trade: buy if dxy is NOT null (tests availability), else trend-only.
  const sma100 = ctx.sma(100, 1);
  if (sma100 == null) { ctx.watch([]); return null; }
  const pos = ctx.pos(ctx.sym);
  if (pos > 0) {
    const sma50 = ctx.sma(50, 1);
    if (sma50 != null && price < sma50) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > sma100) {
    // buy regardless of dxy so we see whether trend alone trades
    return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
  }
  ctx.watch([]);
  return null;
}
