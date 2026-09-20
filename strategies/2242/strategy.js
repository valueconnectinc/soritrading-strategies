/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride + ATR CrashStop 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The clean 200-SMA trend ride is robust across long windows
 * (ETH +1235%/+34%/+49%, all positive) but carries a 43-49% drawdown because it
 * only exits after price has already fallen back through the 200-SMA. This adds
 * a crash-stop: if price collapses far below the SMA in a fast crash, it exits
 * early instead of riding the full fall. A principled risk-management addition,
 * not a parameter-tuned tweak — the 200-SMA entry/exit and the ATR crash band
 * are both standard values.
 * When it buys and sells: buy on a 4h close above the 200-SMA, hold while above
 * it, sell on a close back below it OR if price crashes more than 3 ATRs below
 * the 200-SMA (early exit to cap drawdown).
 * When it does NOT work: the crash-stop can exit a dip that quickly recovers,
 * missing the re-entry; in a slow grind lower (not a fast crash) it still rides
 * the fall until the SMA cross, so the drawdown is only capped for fast crashes.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  const atr = ctx.atr(14, 1);
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null || atr == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit on SMA cross OR crash-stop (3 ATRs below the SMA = fast collapse)
    const crashStop = price < sma - 3.0 * atr;
    if (closePrev < sma || crashStop) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
