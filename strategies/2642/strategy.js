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
 * long-term trend is up, and sells when the trend breaks or gives back too much
 * of its gains. Classic turtle-style trend following — the opposite family from
 * the mean-reversion strategies.
 * When it buys and sells: buys when the close exceeds the 55-day high while
 * price is above the 200-day average; sells when the close falls below the
 * 20-day low OR when price drops 3-ATR below the highest point since entry
 * (chandelier trailing stop, locks in profits). Position risk-sized to 3%.
 * When it does NOT work: in a sideways / choppy market with no sustained trend
 * it triggers false breakouts and gives back money. It also lags sharp
 * reversals because it needs a confirmed pullback before selling.
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
    // track the highest close since entry to trail the stop
    const peak = Math.max(ctx.state.peak || px, px);
    ctx.state.peak = peak;

    // chandelier exit: price fell 3-ATR below the running peak — lock in gains.
    if (atr != null && px < peak - atr * 3) return { side: 'sell', qty: pos };
    // channel exit: close below the 20-day low = trend broke down.
    if (px < lo20) return { side: 'sell', qty: pos };
    return null;
  }

  // entry: 55-day high breakout AND price above the 200-day average.
  if (px > hi55 && px > sma200) {
    ctx.state.peak = px; // start trailing from entry
    if (atr == null) return { side: 'buy', qty: ctx.cash / px * 0.99 };
    // risk 3% of equity per trade on a 2-ATR stop.
    const riskPerCoin = atr * 2;
    const qty = Math.min(ctx.cash / px * 0.99, (ctx.cash * 0.03) / riskPerCoin);
    return { side: 'buy', qty: qty };
  }
  return null;
}
