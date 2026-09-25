/*
 * @coinsori-strategy v1
 * name: BTC 4H Vol-Surge + ATR Trail ONLY (no backstop)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The ATR-trail champion variant also keeps a 20-bar-low
 *   backstop, and the ATR multiplier turned out to be flat (2.5x=3x=4x). This
 *   removes the backstop to isolate whether the ATR trailing stop ALONE is what
 *   cuts the champion's drawdown, or whether the wide backstop was always the
 *   binding stop. Answers whether the ATR trail is the real driver.
 * When it buys and sells: Buy 20-bar-high breaks on above-average volume. Exit
 *   only when price drops 3x ATR below the highest close since entry.
 * When it does NOT work: Without the backstop, a fast crash can gap through the
 *   ATR trail, so deep drawdowns are possible if the trail is too loose.
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
  if (price > hh && vol > avgVol * 1.5) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
