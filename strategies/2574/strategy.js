/*
 * @coinsori-strategy v1
 * name: Defensive Donchian BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The defensive Donchian (55d-high entry, steep-downtrend
 * filter, 3x-ATR disaster stop, 30-day-low exit) is a confirmed cross-asset
 * trend family on ETH (+549%/+18%) and ADA (+538%/+30%). This tests whether it
 * also generalizes to BTC 1d, the largest and most liquid asset. If it beats
 * buy-and-hold on BTC across windows it strengthens the family's robustness.
 * When it buys and sells: buys a 55-day-high breakout (unless steep downtrend);
 * exits on a 30-day low or a 3x-ATR disaster stop from entry.
 * When it does NOT work: high drawdown in sharp reversals; underperforms in
 * choppy sideways markets. This is a higher-risk trend strategy.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || atr == null || ema50 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (price < ll30) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
