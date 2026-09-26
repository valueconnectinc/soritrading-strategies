/*
 * @coinsori-strategy v1
 * name: Donchian Trend-Following BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Crypto spends long stretches trending (parabolic bull runs,
 * sustained bear slides). Instead of trying to catch reversals, this rides the
 * trend: it buys only after price has broken to a new multi-week high (a real
 * uptrend is underway) and sells only after price breaks to a new multi-week
 * low (the trend has clearly turned). This is classic turtle-style trend
 * following — the opposite family from the mean-reversion strategies.
 * When it buys and sells: buys when today's close exceeds the highest close of
 * the last 20 days (entry channel), sells when the close falls below the lowest
 * close of the last 10 days (exit channel). A shorter entry channel reacts
 * faster to new trends; the short exit channel locks in profits early when the
 * trend breaks. Goes near-full so it actually participates in the trend.
 * When it does NOT work: in a sideways / choppy market with no sustained trend
 * it triggers false breakouts and gives back money (whipsaw). It also lags
 * sharp reversals because it needs a confirmed 10-day low before selling, so it
 * gives back a chunk of any peak-to-trough move.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  // turtle 20/10: 20-day high entry, 10-day low exit — faster than 55/20.
  const hi20 = ctx.high(20, 1); // highest high of last 20 closed bars
  const lo10 = ctx.low(10, 1);  // lowest low of last 10 closed bars
  if (hi20 == null || lo10 == null) return null;

  const pos = ctx.position;

  if (pos > 0) {
    // exit: close below the 10-day channel low = trend broke down.
    if (px < lo10) return { side: 'sell', qty: pos };
    return null;
  }

  // entry: close above the 20-day high = fresh uptrend confirmed, go near-full.
  if (px > hi20) {
    return { side: 'buy', qty: ctx.cash / px * 0.99 };
  }
  return null;
}
