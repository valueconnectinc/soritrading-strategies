/*
 * @coinsori-strategy v1
 * name: ETH Trend Hysteresis + CrashAccel Exit 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Improvement on the validated ETH 200-SMA + 0.3xATR hysteresis
 * champion. The champion's documented weakness is exiting too late in a genuine
 * crash and staying long too long in a grinding bear just below the SMA. This
 * version keeps the 0.3xATR dead-band (which absorbs sideways chop) but adds a
 * fast crash-acceleration exit: if price closes below a short 20-SMA while also
 * below the 200-SMA, it exits immediately instead of waiting for the dead-band.
 * When it buys and sells: buy on a 4h close above the 200-SMA; hold while price
 * stays within the dead-band; sell on a close beyond the dead-band OR on a fast
 * breakdown (close below the 20-SMA while under the 200-SMA).
 * When it does NOT work: in a slow grinding bear where price sits just below both
 * SMAs the fast exit can trigger on small bounces and re-enter, adding fees; the
 * fast exit may also cut a healthy pullback short during an uptrend if price dips
 * below the 20-SMA while still above the 200-SMA (it only fires when under 200).
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const sma20 = ctx.sma(20, 1);
  const atr = ctx.atr(14, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma200 == null || sma20 == null || atr == null || closePrev == null || closePrev2 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  // Dead-band width: 0.3x ATR below the 200-SMA (champion's tuned value, plateau).
  const band = 0.3 * atr;
  const exitLine = sma200 - band;

  if (pos <= 0) {
    // buy on a close crossing above the 200-SMA (closed bars for stability)
    if (closePrev2 <= sma200 && closePrev > sma200) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // Fast crash-acceleration exit: under the 200-SMA AND under the 20-SMA means
    // momentum has broken down — leave now rather than wait for the dead-band.
    // The 20-SMA was chosen as a short trend proxy (not tighter, to avoid noise).
    if (closePrev < sma200 && closePrev < sma20) {
      return { side: 'sell', qty: pos };
    }
    // Normal hysteresis exit: close below the dead-band line.
    if (closePrev < exitLine) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
