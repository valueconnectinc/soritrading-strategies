/*
 * @coinsori-strategy v1
 * name: BTC 1D EMA Trend-Ride (upbit)
 * ex: upbit
 * syms: BTC
 * interval: 1d
 * cash: 10000000
 *
 * Why this strategy: A clean long-only trend-ride. Buy when the 50-day EMA is
 * rising and price is above it, stay invested while the trend holds, and exit
 * quickly when price closes back below the 20-day EMA. The fast 20-day exit is
 * meant to cut losses hard in a bear so the strategy holds the bull leg and
 * sidesteps most of the crash.
 * When it buys and sells: Buy when EMA50 is rising and price > EMA50. Sell when
 * price closes below EMA20.
 * When it does NOT work: In a choppy sideways market the 50/20 EMA cross
 * whipsaws and bleeds on fees; it also gives back some of a crash before the
 * 20-day exit fires. It is long-only, so a sustained bear is a losing period.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const ema20 = ctx.ema(20, 1);
  const ema50 = ctx.ema(50, 1);
  const ema50prev = ctx.ema(50, 2);
  if (ema20 == null || ema50 == null || ema50prev == null) return null;

  const trendUp = ema50 > ema50prev;

  if (pos > 0) {
    if (price < ema20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (trendUp && price > ema50) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
  }
  return null;
}
