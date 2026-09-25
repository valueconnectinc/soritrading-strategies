/*
 * @coinsori-strategy v1
 * name: BTC 4H Volume-Surge Breakout + ATR Trail
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The base volume-surge breakout (validated champion) exits
 *   on a wide 20-bar-low stop and gives back a lot of profit, driving a 44%
 *   drawdown. This version adds an ATR-based trailing stop that follows price
 *   up and locks in gains as the trend extends, aiming to cut the drawdown
 *   without trimming the melt-up winners on entry.
 * When it buys and sells: Same entry — buy when price closes above the 20-bar
 *   high on above-average volume. Exit when price drops 3x ATR below the highest
 *   close since entry (trailing), or closes below the 20-bar low as a backstop.
 * When it does NOT work: In choppy markets the tighter ATR trail can exit a
 *   position on a normal pullback that the wide stop would have ridden through,
 *   so it may trade out of some winners early. Long-only, misses bear shorts.
 */
function onUpdate(ctx) {
  let hh = -Infinity, ll = Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    const l = ctx.low(20, i);
    if (h == null || l == null) return null;
    if (h > hh) hh = h;
    if (l < ll) ll = l;
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
    // track highest close since entry
    if (s.highest == null || price > s.highest) s.highest = price;
    const stop = s.highest - 3 * atr;
    // exit on ATR trailing stop OR the wide 20-bar low backstop
    if (price < stop || price < ll) return { side: 'sell', qty: pos };
    return null;
  }
  // reset trailing high on fresh entry
  if (price > hh && vol > avgVol * 1.5) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
