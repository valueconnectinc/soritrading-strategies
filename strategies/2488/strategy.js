/*
 * @coinsori-strategy v1
 * name: Champion + FearGreed Top Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The volume-surge breakout champion buys strength, but
 *   some of its worst trades come from buying breakouts into a sentiment
 *   blow-off top. The Fear & Greed index flags that regime: when it is in
 *   extreme greed (>85), breakouts are more likely to be exhaustion spikes.
 *   Filtering those out should cut the champion's worst losses.
 * When it buys and sells: Same as the champion — buy a 20-bar-high break on
 *   >1.5x volume, exit on a 3x ATR trail — but only when Fear & Greed is not
 *   in extreme greed.
 * When it does NOT work: If the extreme-greed filter also skips genuine
 *   sustained uptrends (which often happen in greed), it can miss big winners
 *   and underperform the plain champion in strong bull legs.
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
  const fg = ctx.data('fg');
  // If sentiment data is missing, fall back to the plain champion (no filter).
  if (fg != null && fg > 85) return null;
  if (price > hh && vol > avgVol * 1.5) {
    ctx.state.highest = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
