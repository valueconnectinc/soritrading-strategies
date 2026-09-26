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
 * trend: it buys only after price has broken to a new multi-week high AND the
 * long-term trend is up, and sells when the trend breaks. Classic turtle-style
 * trend following — the opposite family from the mean-reversion strategies.
 * When it buys and sells: buys when the close exceeds the 55-day high while
 * price is above the 200-day average (long-term uptrend intact); sells when the
 * close falls below the 20-day low. Position is risk-sized to 3% of equity.
 * When it does NOT work: in a sideways / choppy market with no sustained trend
 * it triggers false breakouts and gives back money. It also lags sharp
 * reversals because it needs a confirmed 20-day low before selling, giving back
 * a chunk of any peak-to-trough move.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  const hi55 = ctx.high(55, 1); // highest high of last 55 closed bars
  const lo20 = ctx.low(20, 1);  // lowest low of last 20 closed bars
  const sma200 = ctx.sma(200, 1); // long-term trend direction
  if (hi55 == null || lo20 == null || sma200 == null) return null;

  const pos = ctx.position;
  const atr = ctx.atr(14, 1);

  if (pos > 0) {
    // exit: close below the 20-day channel low = trend broke down.
    if (px < lo20) return { side: 'sell', qty: pos };
    return null;
  }

  // entry: 55-day high breakout AND price above the 200-day average.
  // The 200-SMA gate blocks buying breakouts in a confirmed downtrend.
  if (px > hi55 && px > sma200) {
    if (atr == null) return { side: 'buy', qty: ctx.cash / px * 0.99 };
    // risk 3% of equity per trade on a 2-ATR stop.
    const riskPerCoin = atr * 2;
    const qty = Math.min(ctx.cash / px * 0.99, (ctx.cash * 0.03) / riskPerCoin);
    return { side: 'buy', qty: qty };
  }
  return null;
}
