/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + Partial TP + Trail
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion's single 3x ATR trail either rides a winner
 *   all the way or gives back a lot on the pullback. A partial take-profit that
 *   banks half the position at a 2x ATR gain locks in profit early, then the
 *   remaining half trails at 3x ATR to keep riding strong trends. This targets
 *   a better return/drawdown tradeoff than a single exit rule.
 * When it buys and sells: Buy 20-bar-high breakouts on >1.5x volume. Once up
 *   2x ATR from entry, sell half; the rest exits when price drops 3x ATR below
 *   the highest close since entry.
 * When it does NOT work: In a smooth melt-up the partial TP trims a position
 *   that would have gone much further, capping the biggest winners; it also
 *   adds an extra trade and fee per cycle.
 */
function onUpdate(ctx) {
  let hh = -Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    if (h == null) return null;
    if (h > hh) hh = h;
  }
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(50);
  if (vol == null || avgVol == null) return null;

  const pos = ctx.position;
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    const s = ctx.state;
    if (s.highest == null || price > s.highest) s.highest = price;
    // partial TP: bank half once up 2x ATR from entry
    if (s.tpDone == null && s.entryPx != null && price >= s.entryPx + 2 * atr) {
      s.tpDone = true;
      return { side: 'sell', qty: pos * 0.5 };
    }
    const stop = s.highest - 3 * atr;
    if (price < stop) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > hh && vol > avgVol * 1.5) {
    ctx.state.highest = price;
    ctx.state.tpDone = null;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
