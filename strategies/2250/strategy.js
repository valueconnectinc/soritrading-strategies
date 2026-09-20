/*
 * @coinsori-strategy v1
 * name: ETH Trend Hysteresis Band 0.5 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Tuning variant of the validated hysteresis dead-band trend
 * follower. A wider 0.5x ATR dead-band below the 200-SMA absorbs more sideways
 * chop (less whipsaw) but exits later in a genuine crash (gives back more of a
 * real breakdown). Tested head-to-head against 0.2 and 0.3.
 * When it buys and sells: buy on a 4h close above the 200-SMA; hold while price
 * stays within the band below the SMA; sell only on a close beyond the band.
 * When it does NOT work: the wider band exits later in a real crash and can stay
 * long too long in a grinding bear just below the SMA.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || atr == null || closePrev == null || closePrev2 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  const band = 0.5 * atr;  // wider band: absorbs more chop, exits later on crash
  const exitLine = sma - band;

  if (pos <= 0) {
    if (closePrev2 <= sma && closePrev > sma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    if (closePrev < exitLine) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
