/*
 * @coinsori-strategy v1
 * name: Defensive Donchian SOL 1D
 * ex: binance
 * syms: SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Tests whether the defensive Donchian (proven on ADA 1d:
 * +538%/+30% vs hold +320%/-49%) generalizes to SOL. Same logic: full-position
 * 55-day-high breakout with a steep-downtrend filter and 3x-ATR disaster stop,
 * exiting on a 30-day low. If it beats buy-and-hold on SOL across windows it is
 * a real cross-asset trend family, not an ADA-specific artifact.
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep
 * downtrend); exits on a 30-day low or a 3x-ATR disaster stop.
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
