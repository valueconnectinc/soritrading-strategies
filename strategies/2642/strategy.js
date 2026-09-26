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
 * the last 55 days (entry channel), sells when the close falls below the lowest
 * close of the last 20 days (exit channel). A longer entry channel filters out
 * noise, a shorter exit channel locks in profits early when the trend breaks.
 * When it does NOT work: in a sideways / choppy market with no sustained trend
 * it triggers false breakouts and gives back money (whipsaw). It also lags
 * sharp reversals because it needs a confirmed 20-day low before selling, so it
 * gives back a chunk of any peak-to-trough move.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  // entry: 55-day high breakout, exit: 20-day low — classic turtle parameters.
  // Need 56 bars of history before the 55-day channel is meaningful.
  const hi55 = ctx.high(55, 1); // highest high of last 55 closed bars
  const lo20 = ctx.low(20, 1);  // lowest low of last 20 closed bars
  if (hi55 == null || lo20 == null) return null;

  const pos = ctx.position;
  const atr = ctx.atr(14, 1);

  if (pos > 0) {
    // exit: close below the 20-day channel low = trend broke down, take profits.
    if (px < lo20) return { side: 'sell', qty: pos };
    return null;
  }

  // entry: close above the 55-day high = fresh uptrend confirmed.
  if (px > hi55) {
    // risk-size: risk 1% of equity per trade using ATR, capped at full cash.
    if (atr == null) return { side: 'buy', qty: ctx.cash / px * 0.99 };
    const riskPerCoin = atr * 2; // 2-ATR stop distance
    const qty = Math.min(ctx.cash / px * 0.99, (ctx.cash * 0.01) / riskPerCoin);
    return { side: 'buy', qty: qty };
  }
  return null;
}
