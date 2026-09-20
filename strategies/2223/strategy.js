/*
 * @coinsori-strategy v1
 * name: ETH Daily Trend-Strength + Wide Trailing Stop 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The champion (2216) rides ETH's daily 200-SMA trend and
 * beats buy-and-hold on all windows, but its worst drawdown is 74% (2018-21).
 * Last cycle's tight fast-exits (50-SMA) cut return far more than drawdown.
 * This tries a WIDE trailing stop (45% below the peak since entry) that only
 * triggers on catastrophic crashes — wide enough to preserve the trend ride but
 * cap the worst-case loss.
 * When it buys and sells: same 200-SMA trend-strength entry/exit as the champion,
 * PLUS a hard exit if price falls 45% below the highest close since entry.
 * When it does NOT work: if a crash is a slow grind (not a sharp 45% drop) the
 * trailing stop never triggers and it behaves exactly like the champion; in a
 * parabolic bull it still exits on the first dip and re-enters late.
 */
function onUpdate(ctx) {
  const sma = ctx.sma(200, 1);
  const smaP = ctx.sma(200, 2);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma == null || smaP == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  if (pos <= 0) {
    if (closePrev2 <= smaP && closePrev > sma) {
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
    // wide trailing stop: exit if price is 45% below the running peak since entry
    const peak = ctx.state.peak || closePrev;
    const newPeak = Math.max(peak, closePrev);
    ctx.state.peak = newPeak;
    if (closePrev < newPeak * 0.55) {
      return { side: 'sell', qty: pos };
    }
    // normal 200-SMA exit
    if (closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
