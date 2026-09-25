/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + Vol 2x Only
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Isolates ONLY the volume-threshold change (1.5x -> 2.0x)
 *   on the champion's 20-bar breakout, to see if a stricter volume filter
 *   alone cuts whipsaw trades and improves the weak bear window (W3).
 * When it buys and sells: Buy a 20-bar-high break on >2.0x average volume.
 *   Exit only when price drops 3x ATR below the highest close since entry.
 * When it does NOT work: Raising the volume bar means fewer entries, so it
 *   may miss melt-up runs. If the bear window's loss is trend-driven rather
 *   than noise-driven, a volume filter alone won't fix it.
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
    const stop = s.highest - 3 * atr;
    if (price < stop) return { side: 'sell', qty: pos };
    return null;
  }
  if (price > hh && vol > avgVol * 2.0) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
