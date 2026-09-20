/*
 * @coinsori-strategy v1
 * name: BTC Slow Trend Ride 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: same robust trend-following logic that proved out on ETH
 * (200-bar trend line). Tests whether the edge generalizes from ETH to BTC.
 * When it buys and sells: long while price stays above the slow trend line,
 * sells when price closes below it, re-enters when it climbs back above.
 * When it does NOT work: long sideways chop and lagging exact tops/bottoms.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
