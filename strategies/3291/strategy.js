/*
 * @coinsori-strategy v1
 * name: NEGATIVE CONTROL (expensive flip) 4H
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Negative control for the pairs relative-value idea. It is
 * the exact inverse entry — buys the EXPENSIVE asset (z > +1.5). If the cheap
 * logic is real, this control should lose or underperform.
 * When it buys and sells: buys when ratio z > +1.5, sells when ratio crosses
 * below its mean. Same sizing and cooldown.
 * When it does NOT work: if it makes money, the pairs edge is an artifact.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }
  const other = (ctx.syms || [sym]).find(s => s !== sym);
  if (!other) { ctx.watch([]); return null; }
  const m = ctx.market(other);
  const otherPrice = m && m.price ? m.price : null;
  if (!Number.isFinite(otherPrice) || otherPrice <= 0) { ctx.watch([]); return null; }
  const ratio = price / otherPrice;

  if (!ctx.state.hist) ctx.state.hist = {};
  if (!ctx.state.hist[sym]) ctx.state.hist[sym] = [];
  const arr = ctx.state.hist[sym];
  arr.push(ratio);
  if (arr.length > 201) arr.shift();
  if (arr.length < 201) { ctx.watch([]); return null; }
  const closed = arr.slice(0, -1);
  const mean = closed.reduce((a, b) => a + b, 0) / closed.length;
  const sd = Math.sqrt(closed.reduce((a, b) => a + (b - mean) * (b - mean), 0) / closed.length);
  if (sd <= 0) { ctx.watch([]); return null; }
  const z = (ratio - mean) / sd;

  if (!ctx.state.cd) ctx.state.cd = {};
  if (ctx.state.cd[sym] == null) ctx.state.cd[sym] = 0;
  if (ctx.state.cd[sym] > 0) ctx.state.cd[sym]--;

  const pos = ctx.pos(sym);
  if (pos > 0) {
    if (ratio < mean) { ctx.state.cd[sym] = 3; ctx.watch([]); return { side: 'sell', qty: pos }; }
    ctx.watch([{ side: 'sell', price: mean * otherPrice, trigger: 'below', qty: pos, note: 'ratio mean' }]);
    return null;
  }
  const expensive = z > 1.5 && ctx.state.cd[sym] === 0;
  if (expensive) {
    const maxQty = (ctx.cash / price) * 0.25;
    if (maxQty <= 0) { ctx.watch([]); return null; }
    ctx.state.cd[sym] = 3;
    ctx.watch([]);
    return { side: 'buy', qty: maxQty };
  }
  ctx.watch([]);
  return null;
}
