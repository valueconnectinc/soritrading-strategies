/*
 * @coinsori-strategy v1
 * name: ETH Slow Trend Ride SMA250 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SMA-200 (champion) captures the mega-bull but whipsaws in
 * choppy markets; SMA-300 has much better crash/range defense but misses most of
 * the bull. This tests the midpoint SMA-250 to see if a single length balances
 * both — enough bull participation without giving up all the crash protection.
 * When it buys and sells: buy on a 4h close crossing above the 250-SMA, hold
 * while above it, sell on a close back below the 250-SMA.
 * When it does NOT work: any single slow filter is a compromise — it will lag
 * the champion in a strong bull and lag SMA-300 in a prolonged bear/crash.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(250, 1);
  const smaP = ctx.sma(250, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
