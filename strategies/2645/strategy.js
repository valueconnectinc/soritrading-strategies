/*
 * @coinsori-strategy v1
 * name: Donchian Turtle BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: the turtle trend-following edge was validated on 1d
 * (BTC/ETH/ADA). This tests whether the same slow trend-following works on 4h,
 * where the mean-reversion champion lives and where 4h gives faster signals.
 * It rides multi-week trends with a wide 20-day exit so it is not shaken out of
 * pullbacks.
 * When it buys and sells: buys when the close exceeds the 55-day high (330 bars)
 * while price is above the 200-day average (1200 bars); sells when the close
 * falls below the 20-day low (120 bars). Position risk-sized to 3% of equity.
 * When it does NOT work: in sideways chop it triggers false breakouts; 4h
 * volatility makes the 20-day exit wider so it gives back more on reversals.
 */
function onUpdate(ctx) {
  const px = ctx.price;
  if (px == null) return null;

  // Day-equivalent bars: 55d=330, 20d=120, 200d=1200 on 4h.
  const hi55 = ctx.high(330, 1);
  const lo20 = ctx.low(120, 1);
  const sma200 = ctx.sma(1200, 1);
  if (hi55 == null || lo20 == null || sma200 == null) return null;

  const pos = ctx.position;

  if (pos > 0) {
    if (px < lo20) return { side: 'sell', qty: pos };
    return null;
  }

  if (px > hi55 && px > sma200) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return { side: 'buy', qty: ctx.cash / px * 0.99 };
    const riskPerCoin = atr * 2;
    const qty = Math.min(ctx.cash / px * 0.99, (ctx.cash * 0.03) / riskPerCoin);
    return { side: 'buy', qty: qty };
  }
  return null;
}
