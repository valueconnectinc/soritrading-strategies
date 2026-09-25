/*
 * @coinsori-strategy v1
 * name: BTC 4H Donchian Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Donchian channel breakout is a classic trend-following entry that
 *   has been validated on ETH 4h but not yet on BTC 4h. Tests whether a breakout entry
 *   (buy new 20-bar highs) beats the EMA50/200 crossover champion on the same market.
 * When it buys and sells: Buy when price closes above the highest high of the last 20
 *   bars. Sell when price closes below the lowest low of the last 20 bars (or the 20-SMA).
 * When it does NOT work: Choppy sideways ranges trigger false breakouts and whipsaw.
 *   Long-only, so it misses short-side gains in bear markets.
 */
function onUpdate(ctx) {
  // highest high / lowest low over the last 20 closed bars (ago 1..20)
  let hh = -Infinity, ll = Infinity;
  for (let i = 1; i <= 20; i++) {
    const h = ctx.high(20, i);
    const l = ctx.low(20, i);
    if (h == null || l == null) return null;
    if (h > hh) hh = h;
    if (l < ll) ll = l;
  }
  const price = ctx.price;
  const pos = ctx.position;
  if (pos > 0) {
    // exit on 20-bar low break
    if (price < ll) return { side: 'sell', qty: pos };
    return null;
  }
  // entry on 20-bar high break
  if (price > hh) return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  return null;
}
