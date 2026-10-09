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

  // debug: log every 20th bar
  if (ctx.i % 20 === 0) {
    ctx.log('i=' + ctx.i + ' price=' + price.toFixed(0) + ' s200=' + sma200.toFixed(0) + ' s50=' + sma50.toFixed(0) + ' pos=' + pos);
  }

  if (pos > 0) {
    if (ctx.entryPx != null && price <= ctx.entryPx * 0.75) {
      ctx.log('SELL stop @' + ctx.i);
      return { side: 'sell', qty: pos };
    }
    if (price < sma50) {
      ctx.log('SELL trend @' + ctx.i);
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (price > sma200) {
    ctx.log('BUY @' + ctx.i);
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  return null;
}
