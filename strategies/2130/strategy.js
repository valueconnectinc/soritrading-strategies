/*
 * @coinsori-strategy v1
 * name: ETH Death-Cross Trend 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH trends for long stretches. A slow trend filter (EMA
 * death cross) keeps us in during uptrends and out during downtrends, while a
 * trailing stop locks in gains instead of giving them back.
 * When it buys and sells: it is long while the fast EMA stays above the slow
 * EMA (uptrend). It exits on a death cross (trend turns down) or when price
 * falls a set distance below its recent high (trailing stop).
 * When it does NOT work: in a tight sideways market the EMAs cross back and
 * forth, causing small whipsaw losses; and a sharp one-bar crash can gap past
 * the trailing stop.
 */
function onUpdate(ctx) {
  const emaF = ctx.ema(20, 1);
  const emaS = ctx.ema(50, 1);
  const emaFP = ctx.ema(20, 2);
  const emaSP = ctx.ema(50, 2);
  if (emaF == null || emaS == null || emaFP == null || emaSP == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // trailing stop: ratchet up to just below the highest price seen while long
  let stop = ctx.state.trailStop || null;
  if (pos > 0) {
    if (stop == null || price > stop) {
      stop = price * 0.92; // give back at most 8% from the peak
      ctx.state.trailStop = stop;
    }
  }

  if (pos <= 0) {
    // enter when fast EMA crosses back above slow EMA (golden cross)
    if (emaFP <= emaSP && emaF > emaS) {
      ctx.state.trailStop = null;
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit on death cross or trailing stop
    if (emaF < emaS || (stop != null && price <= stop)) {
      ctx.state.trailStop = null;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
