/*
 * @coinsori-strategy v1
 * name: ETH Long-Term Trend Ride Hysteresis 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Improvement on the validated ETH 200-SMA trend champion.
 * The champion's one weakness is sideways/choppy markets where price oscillates
 * around the 200-SMA: it buys on a cross up, sells on a cross down, then buys
 * again — paying fees and losing to whipsaw. This version adds a hysteresis
 * (dead-band) around the SMA: it stays long through minor dips below the SMA
 * and only exits on a real breakdown, so normal chop around the SMA no longer
 * triggers a sell-then-rebuy cycle.
 * When it buys and sells: buy on a 4h close above the 200-SMA; hold while price
 * stays within the dead-band below the SMA; sell only on a close beyond it.
 * When it does NOT work: the dead-band means it exits later in a genuine crash
 * (gives back a bit more of a real breakdown before leaving), and in a long
 * grinding bear where price sits just below the SMA it can stay long too long.
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

  // Dead-band width: 0.3x ATR below the SMA. Tighter than 0.5 so a genuine
  // crash still exits fairly promptly (keeps W3 downside protection), while
  // still absorbing the shallow sideways dips that caused the champion's
  // whipsaw in W2.
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
