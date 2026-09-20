/*
 * @coinsori-strategy v1
 * name: BTC Slow Trend Ride 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC's biggest gains come from long sustained uptrends.
 * A very slow trend line (200-period) keeps us in during those runs and only
 * steps aside when the trend genuinely breaks, so we capture most of the move
 * and avoid the whipsaw of faster crossovers.
 * When it buys and sells: it is long while price stays above the slow trend
 * line, and sells when price closes below it. It re-enters when price climbs
 * back above.
 * When it does NOT work: in a long sideways market the price repeatedly pokes
 * above and below the trend line, causing small losses; and it lags the exact
 * top/bottom, giving back a little at each turn.
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
    // enter only on a genuine cross: previous close below trend line, current above
    if (closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit when price closes below the slow trend line
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
