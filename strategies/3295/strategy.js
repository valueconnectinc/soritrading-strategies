/*
 * @coinsori-strategy v1
 * name: BTC/ETH Relative-Value MR 4H
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Cross-asset mean reversion in the BTC/ETH ratio. When one
 * asset is historically cheap vs the other (ratio z-score far below its 200-bar
 * mean), it tends to snap back — a different edge than per-asset mean reversion.
 * When it buys and sells: buys the cheap side of the ratio when z < -1.5 AND that
 * asset is in a genuine uptrend (price above a RISING 200-SMA — a falling SMA200
 * means the market is still in a downtrend even if price bounced above it, and
 * the cheap leg keeps falling there). Sells when the ratio crosses back above its
 * mean, or when price falls 2.5 ATR below entry (hard stop caps the months-
 * underwater risk). 25% leg share, 3-bar cooldown.
 * When it does NOT work: the ratio can trend for months (altseason or BTC
 * dominance rally), so a mis-timed buy sits underwater until the stop or the mean
 * crossing. In a broad bear both legs' trend gates stay off (capital safe, no
 * return). A long one-way ratio move defeats the mean-reversion premise.
 */
function onUpdate(ctx) {
  const sym = ctx.sym;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) { ctx.watch([]); return null; }

  // Peer asset price for the ratio (current tick — same bar as our price).
  const other = (ctx.syms || [sym]).find(s => s !== sym);
  if (!other) { ctx.watch([]); return null; }
  const m = ctx.market(other);
  const otherPrice = m && Number.isFinite(m.price) && m.price > 0 ? m.price : null;
  if (otherPrice == null) { ctx.watch([]); return null; }

  const ratio = price / otherPrice;

  // Per-symbol rolling ratio history (state is shared across symbols, so key by sym).
  if (!ctx.state.hist) ctx.state.hist = {};
  if (!Array.isArray(ctx.state.hist[sym])) ctx.state.hist[sym] = [];
  const arr = ctx.state.hist[sym];
  arr.push(ratio);
  if (arr.length > 201) arr.shift();
  if (arr.length < 201) { ctx.watch([]); return null; }

  // Mean and std over the last 200 CLOSED bars (exclude the current forming bar).
  const closed = arr.slice(0, -1);
  const mean = closed.reduce((a, b) => a + b, 0) / closed.length;
  const sd = Math.sqrt(closed.reduce((a, b) => a + (b - mean) * (b - mean), 0) / closed.length);
  if (sd <= 0) { ctx.watch([]); return null; }
  const z = (ratio - mean) / sd;

  // 3-bar cooldown per symbol.
  if (!ctx.state.cd) ctx.state.cd = {};
  if (ctx.state.cd[sym] == null) ctx.state.cd[sym] = 0;
  if (ctx.state.cd[sym] > 0) ctx.state.cd[sym]--;

  const pos = ctx.pos(sym);

  // Exit: ratio back above its mean, or hard stop 2.5 ATR below entry.
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    const stopPx = atr != null ? ctx.entryPx - 2.5 * atr : 0;
    if (ratio > mean || (stopPx > 0 && ctx.price < stopPx)) {
      ctx.state.cd[sym] = 3;
      ctx.watch([]);
      return { side: 'sell', qty: pos };
    }
    ctx.watch([{ side: 'sell', price: mean * otherPrice, trigger: 'above', qty: pos, note: 'ratio mean' },
               { side: 'sell', price: stopPx, trigger: 'below', qty: pos, note: '2.5 ATR hard stop' }]);
    return null;
  }

  // Trend gate: price above a RISING 200-SMA. A rising SMA excludes bear-market
  // rallies where the cheap ratio leg keeps falling despite price > SMA.
  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const trendOk = sma200 != null && sma200prev != null && price > sma200 && sma200 > sma200prev;

  // Entry: this symbol 1.5 SD cheap vs peer, in a genuine uptrend, not in cooldown.
  const cheap = z < -1.5 && trendOk && ctx.state.cd[sym] === 0;
  if (cheap) {
    const maxQty = (ctx.cash / price) * 0.25;
    if (maxQty <= 0) { ctx.watch([]); return null; }
    ctx.state.cd[sym] = 3;
    ctx.watch([]);
    return { side: 'buy', qty: maxQty };
  }

  ctx.watch([{ side: 'buy', price: mean * otherPrice, trigger: 'below', note: 'ratio z<-1.5',
    conds: [{ label: 'ratio z-score', now: +z.toFixed(2), op: '<', ref: -1.5, closed: true },
            { label: 'price>SMA200 & SMA rising', ok: trendOk }] }]);
  return null;
}
