/*
 * @coinsori-strategy v1
 * name: BTC 4H Volume-Surge Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Volume is a genuinely different signal family from price indicators.
 *   A breakout on above-average volume is more likely to be a real move than a quiet one —
 *   tests whether adding a volume-confirmation filter improves breakout entries on BTC 4h
 *   (the plain Donchian breakout just failed, so volume may be the missing ingredient).
 * When it buys and sells: Buy when price closes above the 20-bar high AND volume is above
 *   its 50-bar average. Sell when price closes below the 20-bar low.
 * When it does NOT work: Quiet grind-up markets never trigger the volume filter (stays in
 *   cash too long). Long-only, so it misses short-side gains in bear markets.
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
    if (price < ll) return { side: 'sell', qty: pos };
    return null;
  }
  // entry: 20-bar high break on above-average volume
  if (price > hh && vol > avgVol * 1.5) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
