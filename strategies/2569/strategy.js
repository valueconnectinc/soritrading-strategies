/*
 * @coinsori-strategy v1
 * name: Defensive Donchian FastExit15 ADA 1D
 * ex: binance
 * syms: ADAUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The defensive Donchian second family (+538%/+30% vs hold
 * +320%/-49%) has high 62-74% drawdown. Prior cycles showed position-SIZE
 * reduction destroys the bull-run edge. This version instead uses a FASTER
 * EXIT (15-day low instead of 30-day) to cut drawdown by getting out sooner on
 * reversals, while keeping FULL position during the trend so bull gains hold.
 * When it buys and sells: buys a 55-day-high breakout (unless in a steep
 * downtrend); exits on a 15-day low or a 3x-ATR disaster stop.
 * When it does NOT work: a faster exit risks whipsawing out of healthy pullbacks
 * in strong trends, potentially cutting some bull-run profit. If the 15-day exit
 * churns too much, the 30-day baseline is better.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll15 = ctx.low(15, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll15 == null || atr == null || ema50 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // disaster stop: cut before a trend break turns catastrophic
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    // faster exit: 15-day low gets out sooner than the 30-day baseline
    if (price < ll15) return { side: 'sell', qty: pos };
    return null;
  }

  // steep-downtrend filter: no breakout buys while crashing
  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
