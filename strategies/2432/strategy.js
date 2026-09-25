/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto trends can run for weeks or months, and the simplest
 *   reliable way to capture them is to stay long while the fast trend is above the
 *   slow trend and step aside when it turns down. This is a clean, parameter-light
 *   trend follower: no clever filters, just discipline on entry and exit.
 * When it buys and sells: Buy when the 50-period EMA crosses above the 200-period
 *   EMA (uptrend begins). Sell when it crosses back below (trend ends).
 * When it does NOT work: In choppy sideways markets the two EMAs whipsaw in and
 *   out and pay fees. It lags sharp reversals and is long-only, so it misses
 *   short-side gains in bear markets. It also rides drawdowns during a downtrend
 *   before the slow exit triggers.
 */
function onUpdate(ctx) {
  const fast = ctx.ema(50, 1);
  const slow = ctx.ema(200, 1);
  if (fast == null || slow == null) return null;
  const pos = ctx.position;
  if (pos > 0) {
    if (fast < slow) return { side: 'sell', qty: pos };
    return null;
  }
  if (fast > slow) return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  return null;
}
