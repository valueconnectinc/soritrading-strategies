/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride with Slope Filter 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The plain 200-SMA trend ride is the job's most robust
 * result (positive on all 3 long windows), but it does 123-148 trades because
 * price whipsaws around the SMA in flat markets. Adding a slope condition on
 * the 200-SMA itself should skip false breakouts: only buy when the long-term
 * trend is genuinely turning up, not just price poking above a flat SMA.
 * When it buys and sells: buy on a 4h close above a rising 200-SMA, hold while
 * price stays above it, sell on a close back below the 200-SMA.
 * When it does NOT work: in a long flat/choppy market it still whipsaws (just
 * fewer times); it also gives back the last part of every trend because it only
 * exits after price has fallen back through the SMA.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  // slope of the 200-SMA itself: rising means the long-term trend is up
  const smaRising = sma > smaP;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // enter only when price crosses above a RISING 200-SMA (skip flat-SMA breakouts)
    if (smaRising && closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit on a close back below the 200-SMA (same as base, trend broken)
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
