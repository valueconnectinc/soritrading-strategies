/*
 * @coinsori-strategy v1
 * name: ETH Daily Trend with Fast Re-entry
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The ETH daily 200-SMA trend ride (2216) is our best
 * validated family, but its known weakness is re-entering late after a dip
 * (it waits for a full fresh 200-SMA cross). This variant keeps the same
 * 200-SMA exit but adds a faster 50-SMA re-entry: once we've been in and the
 * trend is still above the 200-SMA, a close back above the 50-SMA gets us back
 * in sooner, reducing the re-entry lag that costs bull gains.
 * When it buys and sells: initial long on a close crossing above the 200-SMA;
 * after that, re-enter on a close back above the 50-SMA while price stays above
 * the 200-SMA. Exit on a close below the 200-SMA. Position scales with trend.
 * When it does NOT work: the faster 50-SMA re-entry can jump back in on dead-cat
 * bounces within a developing bear, adding more trades and fees; in a choppy
 * range it re-enters too eagerly and whipsaws.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const ema50 = ctx.sma(50, 1);
  const ema50P = ctx.sma(50, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || ema50 == null || ema50P == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  if (pos <= 0) {
    // initial entry: fresh close above the 200-SMA
    // re-entry: close back above the 50-SMA while still above the 200-SMA
    const freshCross = closePrev2 <= smaP && closePrev > sma;
    const fastReentry = closePrev2 <= ema50P && closePrev > ema50 && closePrev > sma;
    if (freshCross || fastReentry) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const distPct = (closePrev - sma) / sma;
      const risk = 300 + Math.min(Math.max(distPct * 20000, 0), 1200);
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // exit when the daily close falls back below the 200-SMA
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
