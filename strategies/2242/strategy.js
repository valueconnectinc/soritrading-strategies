/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride Faster Exit 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The base 200-SMA trend ride is robust but gives back the
 * last part of every trend because it only exits after price falls all the way
 * back through the 200-SMA. This variant keeps the same 200-SMA entry but exits
 * earlier on a close below the 50-SMA, hoping to lock in more of each trend and
 * cut drawdown. The question is whether faster exits cost more in whipsaw than
 * they save in drawdown.
 * When it buys and sells: buy on a close above the 200-SMA, sell on a close
 * below the 50-SMA while in position.
 * When it does NOT work: in a choppy uptrend price dips below the 50-SMA often
 * and gets shaken out too early, then re-enters higher — this can underperform
 * simply holding through pullbacks.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const sma50 = ctx.sma(50, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma200 == null || sma50 == null || closePrev == null || closePrev2 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // same entry as base: close crossing above the 200-SMA
    if (closePrev2 <= sma200 && closePrev > sma200) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // faster exit: close below the 50-SMA (lock in more of the trend)
    if (closePrev < sma50) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
