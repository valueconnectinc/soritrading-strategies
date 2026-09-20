/*
 * @coinsori-strategy v1
 * name: DOGE BB-RSI Mean Reversion SoftGuard 4H
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The strict crash-guard version cut drawdown but gave up too
 * much bull-market upside (2019-22 +285% vs baseline +1094%). This softer guard
 * relaxes the trend filter (only avoids the deepest collapses) and widens the
 * stop, keeping more of the mean-reversion upside while still capping the worst
 * of a crash.
 * When it buys and sells: buy when price touches the lower Bollinger band AND
 * RSI is oversold AND price is not far below the long SMA (soft collapse guard).
 * Sell back at the middle band or overbought RSI; stop out ~15% below entry.
 * When it does NOT work: in a sustained parabolic bull it sits in cash and misses
 * the melt-up; in a slow grind-down it still catches some falling knives.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  const sma100 = ctx.sma(100, 1);
  if (bb == null || rsi == null || sma100 == null) return null;
  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // soft collapse guard: only skip the deepest crashes (price >10% below long mean)
    if (price < bb.lower && rsi < 35 && price > sma100 * 0.90) {
      return { side: 'buy', qty: (cash / price) * 0.98 };
    }
    return null;
  } else {
    // exit at the mean / overbought, or wider 15% stop
    if (price > bb.mid || rsi > 65 || price < ctx.entryPx * 0.85) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
