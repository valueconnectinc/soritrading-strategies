/*
 * @coinsori-strategy v1
 * name: ETH Daily Trend-Strength FastExit 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the daily ETH 200-SMA trend-strength ride beats buy-and-hold
 * on recent windows with low MDD, but on the 2018-21 window the slow 200-SMA
 * holds through the 2018 crash (MDD 74%). This adds a faster 50-SMA exit: we
 * still enter on the 200-SMA crossover, but we exit early if price breaks below
 * the 50-SMA, cutting the deepest crash drawdowns while keeping the trend ride.
 * When it buys and sells: long on a daily close above the 200-SMA, sized by
 * trend strength. Exit if the close falls below the 50-SMA (fast trend break,
 * crash protection) OR below the 200-SMA (full trend end).
 * When it does NOT work: the faster exit sells into normal bull dips and can
 * miss the V-shaped bounce; in a strong bull it churns more than the pure
 * 200-SMA version and can underperform buy-and-hold in melt-ups.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  const sma200P = ctx.sma(200, 2);
  const sma50 = ctx.sma(50, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  const closePrev2 = ctx.closes[ctx.closes.length - 3];
  if (sma200 == null || sma200P == null || sma50 == null || closePrev == null || closePrev2 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const cash = ctx.cash;

  if (pos <= 0) {
    // enter on a fresh close above the 200-SMA (crossover)
    if (closePrev2 <= sma200P && closePrev > sma200) {
      const atr = ctx.atr(14, 1);
      if (atr == null || atr <= 0) return { side: 'buy', qty: (cash / price) * 0.98 };
      const distPct = (closePrev - sma200) / sma200;
      const risk = 300 + Math.min(Math.max(distPct * 20000, 0), 1200);
      const riskQty = risk / atr;
      const maxQty = (cash / price) * 0.98;
      return { side: 'buy', qty: Math.min(riskQty, maxQty) };
    }
    return null;
  } else {
    // exit on a fast trend break (below 50-SMA) OR full trend end (below 200-SMA)
    if (closePrev < sma50 || closePrev < sma200) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
