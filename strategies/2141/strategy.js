/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride with Trailing Exit 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH's biggest gains come from long sustained uptrends.
 * A very slow trend line (200-period) keeps us in during those runs. A faster
 * 50-period trailing exit locks in more of each trend and cuts the lag at
 * tops, reducing the deep drawdowns a pure 200-SMA exit suffers on reversals.
 * When it buys and sells: enters long when price closes back above the
 * 200-period trend line; exits when price closes below the faster 50-period
 * line or the 200-line, whichever happens first.
 * When it does NOT work: in long sideways chop the 50-line exit can trigger
 * small losses, and it still lags the exact top of a melt-up.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const ema50 = ctx.ema(50, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (sma200 == null || ema50 == null || closePrev == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos <= 0) {
    if (closePrev > sma200) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    if (closePrev < ema50 || closePrev < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
