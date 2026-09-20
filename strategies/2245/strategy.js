/*
 * @coinsori-strategy v1
 * name: ETH Trend Ride + ATR Trailing Stop 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The plain 200-SMA trend ride is a solid champion but its
 * documented weakness is that it gives back the last part of every trend — it
 * only exits after price has already fallen all the way back through the SMA.
 * Adding an ATR-scaled trailing stop lets it lock in profits near the top of a
 * move instead of riding the whole reversal down. The ATR scaling keeps the
 * stop wide enough to survive normal noise but tight enough to capture gains.
 * When it buys and sells: buy on a 4h close crossing above the 200-SMA; while
 * holding, exit if price closes X ATRs below its running peak (trailing stop)
 * OR if it closes back below the 200-SMA (the original safety exit).
 * When it does NOT work: a trailing stop can exit too early in a strong trend
 * that keeps making new highs after a normal pullback, then re-entering costs
 * fees; in a choppy market it may stop out repeatedly. The 200-SMA exit still
 * runs as a backstop for crashes.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // buy on a close crossing above the 200-SMA (closed bars for stability)
    if (closePrev2 <= smaP && closePrev > sma) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // 200-SMA backstop: exit if a close falls back below it
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }

    // ATR trailing stop: track the running peak of closes while holding.
    // Exit if the latest close is > 5 ATRs below the peak (5 ATRs is wide
    // enough to survive normal 4h noise but catches a real trend reversal).
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    let peak = closePrev;
    for (let a = 2; a <= 60; a++) {
      const c = ctx.closes[ctx.closes.length - a];
      if (c == null) break;
      if (c > peak) peak = c;
    }
    if (closePrev < peak - 5 * atr) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
