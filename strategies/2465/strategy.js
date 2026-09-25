/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + Stricter Entry
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The champion (3x ATR trail) is validated, but its weak
 *   window is the bear (W3, +35%). This tests whether a STRICTER entry — a
 *   higher volume threshold (2.0x) and shorter breakout lookback (10 bars) —
 *   cuts whipsaw trades and improves the bear window without hurting the
 *   strong bull windows.
 * When it buys and sells: Buy a 10-bar-high break on >2.0x average volume.
 *   Exit only when price drops 3x ATR below the highest close since entry.
 * When it does NOT work: A stricter entry means fewer trades, so it may miss
 *   the melt-up runs where looser entries caught the big winners. If the bear
 *   window is driven by trend, not noise, a stricter filter won't help.
 */
function onUpdate(ctx) {
  let hh = -Infinity;
  for (let i = 1; i <= 10; i++) {
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
