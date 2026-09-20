/*
 * @coinsori-strategy v1
 * name: SOL Donchian Breakout 30/20 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the Donchian 55/30 daily breakout is a validated robust
 * trend-follower, but on SOL it was mixed (id 690) because SOL is young and
 * volatile — the 55-day window is too slow for its cycles. This uses a faster
 * 30-day entry / 20-day exit channel to match SOL's quicker trends.
 * When it buys and sells: buys when price breaks above the 30-day high, sells
 * when price breaks below the 20-day low. Full capital in the trend.
 * When it does NOT work: a faster channel whipsaws more in choppy sideways
 * markets (more small losses), and SOL's deep corrections give large drawdowns.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const cash = ctx.cash;
  const pos = ctx.position;
  if (price == null || price <= 0) return null;

  const hiN = ctx.high(30, 1);
  const loM = ctx.low(20, 1);
  if (hiN == null || loM == null) return null;

  const equity = cash + pos * price;

  let targetQty;
  if (price < loM) {
    targetQty = 0; // broke the 20-day low: exit the trend
  } else if (pos > 0) {
    targetQty = equity / price; // hold until the 20-day low breaks
  } else if (price > hiN) {
    targetQty = equity / price; // new 30-day breakout: full position
  } else {
    targetQty = 0;
  }

  const diff = targetQty - pos;
  if (Math.abs(diff) < 0.0001 * Math.max(0.0001, pos)) return null;

  if (diff > 0) {
    const buyQty = Math.min(diff, (cash / price) * 0.98);
    if (buyQty <= 0) return null;
    return { side: 'buy', qty: buyQty };
  } else {
    return { side: 'sell', qty: Math.min(pos, -diff) };
  }
}
