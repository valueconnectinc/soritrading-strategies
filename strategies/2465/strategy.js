/*
 * @coinsori-strategy v1
 * name: BTC 4H Short-Only Vol-Surge Breakdown
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The two-sided long+short failed because the short side
 *   bled in bull regimes. This isolates the short side to test whether shorting
 *   20-bar-low breakdowns on volume has ANY standalone edge in bear windows —
 *   the mirror of the champion's validated long logic.
 * When it buys and sells: Short when price breaks the 20-bar low on >1.5x
 *   volume. Cover when price rises 3x ATR above the lowest close since entry.
 * When it does NOT work: In a bull or choppy market shorting breakdowns gets
 *   squeezed violently — this is expected to lose most of the time; it is a
 *   diagnostic to see if the bear-window edge exists at all.
 */
function onUpdate(ctx) {
  let ll = Infinity;
  for (let i = 1; i <= 20; i++) {
    const l = ctx.low(20, i);
    if (l == null) return null;
    if (l < ll) ll = l;
  }
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(50);
  if (vol == null || avgVol == null) return null;
  const s = ctx.state;

  const pos = ctx.position;
  if (pos < 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    if (s.lowest == null || price < s.lowest) s.lowest = price;
    if (price > s.lowest + 3 * atr) return { side: 'buy', qty: -pos };
    return null;
  }
  if (price < ll && vol > avgVol * 1.5) {
    s.lowest = price;
    return { side: 'sell', qty: (ctx.cash / ctx.price) * 0.98 };
  }
  return null;
}
