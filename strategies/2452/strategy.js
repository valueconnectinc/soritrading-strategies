/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail 2x ONLY
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The 3x ATR-trail-only version (no backstop) is the clean
 *   champion with ~30% MDD. This tightens the trail to 2x ATR to test whether a
 *   closer stop further cuts drawdown, now that the redundant 20-bar-low
 *   backstop is removed and the multiplier can actually bind.
 * When it buys and sells: Buy 20-bar-high breaks on above-average volume. Exit
 *   when price drops 2x ATR below the highest close since entry.
 * When it does NOT work: A tighter trail exits more winners on normal pullbacks
 *   and can whip in choppy markets, so it may cut returns more than MDD.
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
    const stop = s.highest - 2 * atr;
    if (price < stop) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > hh && vol > avgVol * 1.5) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
