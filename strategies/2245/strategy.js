/*
 * @coinsori-strategy v1
 * name: ETH Slow Trend Ride SMA300 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The validated ETH 200-SMA trend ride is the only robust
 * family in this job, but its documented weakness is whipsaw in choppy markets
 * and giving back the last part of a trend (it only exits after price falls all
 * the way back through the SMA). A slower 300-SMA filter should be even more
 * selective: fewer, later entries but fewer false round-trips around the boundary.
 * This is a single-parameter, out-of-sample test — the champion was validated at
 * SMA 200, so SMA 300 is a fresh check, not a re-tuned fit.
 * When it buys and sells: buy on a 4h close crossing above the 300-SMA, hold
 * while above it, sell on a close back below the 300-SMA.
 * When it does NOT work: an even slower filter may miss the early, biggest part
 * of a strong bull (later entry, later exit) and could sit in cash longer during
 * choppy recoveries. In a long flat range it still whipsaws, just less often.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(300, 1);
  const smaP = ctx.sma(300, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // buy on a close crossing above the 300-SMA (closed bars for stability)
    if (closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // sell on a close crossing back below the 300-SMA
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
