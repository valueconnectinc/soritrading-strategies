/*
 * @coinsori-strategy v1
 * name: ETH Long-Term Trend Ride Hysteresis 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Validated ETH 200-SMA trend follower with a 0.3xATR
 * hysteresis dead-band. Band width was proven to be a plateau (0.2/0.3/0.5 all
 * similar across bull/chop/crash windows); 0.3 is the champion. The dead-band
 * absorbs shallow sideways dips around the SMA so normal chop no longer triggers
 * a sell-then-rebuy whipsaw cycle.
 * When it buys and sells: buy on a 4h close above the 200-SMA; hold while price
 * stays within the 0.3xATR dead-band below the SMA; sell only on a close beyond it.
 * When it does NOT work: the dead-band exits later in a genuine crash (gives back
 * a bit more of a real breakdown before leaving), and in a long grinding bear
 * where price sits just below the SMA it can stay long too long. Adding a faster
 * crash exit was tested and made the crash window WORSE (whipsaw), so it is kept
 * simple.
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

  // Dead-band width: 0.3x ATR below the SMA (champion's tuned value, plateau).
  const band = 0.3 * atr;
  const exitLine = sma - band;

  if (pos <= 0) {
    // buy on a close crossing above the 200-SMA (closed bars for stability)
    if (closePrev2 <= sma && closePrev > sma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit only on a close below the dead-band line, not every dip under the SMA
    if (closePrev < exitLine) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
