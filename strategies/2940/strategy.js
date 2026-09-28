/*
 * @coinsori-strategy v1
 * name: BTC 1D Golden-Cross Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The golden cross (50-day average crossing above the
 * 200-day average) is the most durable long-term trend signal in markets. On a
 * DAILY timeframe trend moves are much cleaner than on 4h — whipsaw that
 * killed the 4h trend test is largely filtered out. We ride the trend while it
 * is intact and exit when it breaks, a simple and historically robust approach.
 *
 * When it buys and sells: buys when the 50-SMA is above the 200-SMA (golden
 * cross / uptrend structure) and price is above the 200-SMA. Sells when price
 * closes back below the 200-SMA (trend broken). Sizing is 60% of cash so a
 * single bad signal cannot wipe the account.
 *
 * When it does NOT work: in a long sideways range the averages cross back and
 * forth and it whipsaws; in a sharp V-shaped crash it exits late and re-enters
 * late. It never shorts, so it loses nothing extra in bears but also never
 * profits from them.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  const s50 = ctx.sma(50, 1);
  const s200 = ctx.sma(200, 1);
  if (s50 == null || s200 == null) return null;

  const uptrend = px > s200 && s50 > s200;

  if (ctx.position === 0) {
    if (uptrend) {
      // 60% sizing: one losing signal costs at most 60% of a position, not
      // the whole account — keeps drawdown survivable.
      return { side: 'buy', qty: ctx.cash / px * 0.60 };
    }
    return null;
  }

  if (!uptrend) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
