/*
 * @coinsori-strategy v1
 * name: BTC 1D Donchian Breakout Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's biggest daily moves start when price clears a
 * multi-week range on the daily chart. A Donchian breakout catches the start
 * of those trends, and a shorter Donchian exit cuts losers fast.
 * When it buys and sells: Buys when a CLOSED bar closes above the highest high
 * of the previous 55 days. Sells when a closed bar closes below the lowest low
 * of the previous 20 days (tight trailing exit).
 * When it does NOT work: Choppy sideways markets produce false breakouts and
 * repeated whipsaw losses; it also sits out of bear-market rallies.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position;
  const prevClose = ctx.closes[1];
  if (prevClose == null) return null;

  // breakout level: highest high of the 55 days BEFORE the last closed day
  const hh = ctx.high(55, 2);
  // exit level: lowest low of the 20 days before the last closed day
  const ll = ctx.low(20, 2);
  if (hh == null || ll == null) return null;

  if (pos > 0) {
    if (prevClose < ll) return { side: 'sell', qty: pos };
    return null;
  }

  if (prevClose > hh) {
    return { side: 'buy', qty: ctx.cash / px * 0.99 };
  }
  return null;
}
