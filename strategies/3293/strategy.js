/*
 * @coinsori-strategy v1
 * name: Multi-Asset Momentum Rotation 4H
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Cross-sectional momentum — relative strength across crypto majors
 * persists for weeks to months. Instead of betting on one asset's trend, this holds
 * whichever of 5 majors has the strongest 60-day momentum and switches only when
 * another asset is clearly stronger. When no asset has positive momentum it stays in
 * cash, protecting capital in bear markets.
 * When it buys and sells: Each 4h bar it ranks the 5 assets by 60-day momentum
 * (price vs its 60-day average). The top asset with positive momentum is held with
 * ~99% of cash; it is sold when it is no longer the clear leader, momentum turns
 * negative, or price falls 20% below entry (hard stop). A 2% lead is required to
 * switch, to avoid paying fees every bar.
 * When it does NOT work: In a broad crash all momentum turns negative and it sits in
 * cash (protects capital, earns nothing). In chop where leadership flips every few
 * days it pays many fees and lags buy-and-hold. It can also buy an asset right at a
 * local top just before a sharp reversal.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  // 60-day momentum = price vs its 60-day average (4h bars: 360).
  const sma = ctx.sma(360, 1);
  if (sma == null || sma <= 0) { ctx.watch([]); return null; }
  const mom = price / sma - 1;

  // Remember each symbol's momentum across ticks (state is shared across symbols).
  if (!ctx.state.mom) ctx.state.mom = {};
  ctx.state.mom[sym] = mom;

  const syms = (ctx.syms && ctx.syms.length) ? ctx.syms : [sym];
  // Wait until every symbol has reported its momentum before ranking.
  let ready = true;
  let bestSym = null, bestMom = -Infinity;
  for (const s of syms) {
    const m = ctx.state.mom[s];
    if (m == null) { ready = false; break; }
    if (m > bestMom) { bestMom = m; bestSym = s; }
  }
  if (!ready) { ctx.watch([]); return null; }

  const pos = ctx.pos(sym);
  if (pos > 0) {
    const stopPx = ctx.entryPx * 0.80; // 20% hard stop caps crash damage before momentum rolls over
    // We leave only if another asset leads by >2% or our own momentum is negative.
    const weLead = (sym === bestSym) || (mom >= bestMom * 0.98);
    const momPositive = mom > 0;
    if (price <= stopPx || !weLead || !momPositive) {
      ctx.watch([]);
      return { side: 'sell', qty: pos };
    }
    ctx.watch([{ side: 'sell', price: stopPx, trigger: 'below', qty: pos, note: '20% hard stop' }]);
    return null;
  }

  // Flat: buy only the clear leader with positive momentum.
  if (sym === bestSym && mom > 0) {
    let qty = (ctx.cash / price) * 0.99;
    if (qty <= 0) { ctx.watch([]); return null; }
    ctx.watch([]); // rank-based entry — no fixed price level to wait for
    return { side: 'buy', qty: qty };
  }

  ctx.watch([]); // rank-based — no discrete price level
  return null;
}
