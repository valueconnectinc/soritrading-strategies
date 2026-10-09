/*
 * @coinsori-strategy v1
 * name: TrendRide200
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's long-term trend is up, but it has brutal bear
 * drawdowns. A simple rule — stay long while price is above its 200-day
 * average, exit when the trend breaks — captures most of the bull while
 * sidestepping the worst of the bears.
 * When it buys and sells: buys when price closes above the 200-day average;
 * sells when price closes below the 50-day average (trailing exit) or drops
 * 25% below the entry (hard stop).
 * When it does NOT work: in a long sideways chop around the 200-day average it
 * whipsaws in and out of the market and pays fees; and the 50-day trailing exit
 * gives back part of every pullback before it re-enters.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const sma50 = ctx.sma(50, 1);
  if (sma50 == null) return null;
  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // hard stop: -25% from entry caps a single losing trade
    if (ctx.entryPx != null && price <= ctx.entryPx * 0.75) {
      return { side: 'sell', qty: pos };
    }
    // trailing exit: trend broken when price falls below its 50-day average
    if (price < sma50) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // enter only when a confirmed uptrend is in place
  if (price > sma200) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  return null;
}
