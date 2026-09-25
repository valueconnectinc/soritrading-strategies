/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail + Lookback 10
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Isolates ONLY the breakout-lookback change (20 -> 10
 *   bars) at the champion's 1.5x volume, to see if a shorter breakout window
 *   triggers earlier on fresh moves and improves the weak bear window (W3).
 * When it buys and sells: Buy a 10-bar-high break on >1.5x average volume.
 *   Exit only when price drops 3x ATR below the highest close since entry.
 * When it does NOT work: A shorter lookback is more sensitive and fires on
 *   more noise, so it may add whipsaw trades in choppy regimes. If the bear
 *   window's loss is trend-driven, earlier entries won't help.
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
  if (price > hh && vol > avgVol * 1.5) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
