/*
 * @coinsori-strategy v1
 * name: BTC/ETH Relative-Value Rotation 4H
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Cross-asset mean reversion in the BTC/ETH ratio. When one
 * asset is historically cheap vs the other (ratio z-score far below its 200-bar
 * mean), it tends to snap back — a different edge than per-asset mean reversion.
 * When it buys and sells: It holds the asset whose price is cheap relative to the
 * other (z-score < -1.5 buys this symbol) and sells when the ratio crosses back
 * above its mean. Each leg sized 25% of equity. 3-bar cooldown between trades.
 * When it does NOT work: The ratio can trend for months (e.g. legs of an
 * altseason or a BTC dominance rally), so a mis-timed buy can sit underwater a
 * long time. In a broad bear BOTH signals vanish and it just holds whatever it
 * last bought — no capital protection on its own.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  // The peer asset price for the ratio.
  const other = (ctx.syms || [sym]).find(s => s !== sym);
  if (!other) { ctx.watch([]); return null; }
  const m = ctx.market(other);
  const otherPrice = m && m.price ? m.price : null;
  if (!Number.isFinite(otherPrice) || otherPrice <= 0) { ctx.watch([]); return null; }

  const ratio = price / otherPrice;

  // Maintain a rolling history of the ratio ourselves (ctx has no cross-asset indicator).
  if (!ctx.state.hist) ctx.state.hist = {};
  if (!ctx.state.hist[sym]) ctx.state.hist[sym] = [];
  const arr = ctx.state.hist[sym];
  arr.push(ratio);
  if (arr.length > 201) arr.shift();
  if (arr.length < 201) { ctx.watch([]); return null; }

  // Mean and std of the ratio over the last 200 CLOSED bars (exclude the current, forming bar).
  const closed = arr.slice(0, -1);
  const mean = closed.reduce((a, b) => a + b, 0) / closed.length;
  const sd = Math.sqrt(closed.reduce((a, b) => a + (b - mean) * (b - mean), 0) / closed.length);
  if (sd <= 0) { ctx.watch([]); return null; }
  const z = (ratio - mean) / sd;

  // 3-bar cooldown per symbol after any trade to cut whipsaw in the ratio.
  if (!ctx.state.cd) ctx.state.cd = {};
  if (ctx.state.cd[sym] == null) ctx.state.cd[sym] = 0;
  if (ctx.state.cd[sym] > 0) ctx.state.cd[sym]--;

  const pos = ctx.pos(sym);

  // Exit: ratio crosses back above its mean -> the cheap edge is gone.
  if (pos > 0) {
    if (ratio > mean) { ctx.state.cd[sym] = 3; ctx.watch([]); return { side: 'sell', qty: pos }; }
    ctx.watch([{ side: 'sell', price: mean * otherPrice, trigger: 'above', qty: pos, note: 'ratio mean' }]);
    return null;
  }

  // Entry: this symbol is 1.5 SD cheap vs the peer and not in cooldown.
  // 25% leg share keeps it a two-leg basket of half equity each.
  const cheap = z < -1.5 && ctx.state.cd[sym] === 0;
  if (cheap) {
    const maxQty = (ctx.cash / price) * 0.25;
    if (maxQty <= 0) { ctx.watch([]); return null; }
    ctx.state.cd[sym] = 3;
    ctx.watch([]);
    return { side: 'buy', qty: maxQty };
  }

  ctx.watch([{ side: 'buy', price: mean * otherPrice * (1 - 0.0), trigger: 'below', note: 'ratio z<-1.5',
    conds: [{ label: 'ratio z-score', now: +z.toFixed(2), op: '<', ref: -1.5, closed: true }] }]);
  return null;
}
