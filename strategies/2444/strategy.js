/*
 * @coinsori-strategy v1
 * name: SOL 4H Volume-Surge Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Generalization test — the volume-confirmed breakout worked on BTC
 *   and ETH 4h. Testing whether the same volume-surge breakout family also works on SOL
 *   4h would show it is broadly applicable across assets, strengthening it as a
 *   portfolio building block.
 * When it buys and sells: Buy when price closes above the 20-bar high AND volume is
 *   above its 50-bar average. Sell when price closes below the 20-bar low.
 * When it does NOT work: Quiet grind-up markets never trigger the volume filter (stays
 *   in cash too long). Long-only, so it misses short-side gains in bear markets.
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
