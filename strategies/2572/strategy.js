/*
 * @coinsori-strategy v1
 * name: Defensive Donchian ChandelierExit ETH 1D
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The defensive Donchian (55d-high entry, steep-downtrend
 * filter, 3x-ATR disaster stop) generalizes well cross-asset (ETH +550%/+18%)
 * but carries high drawdown (44-58%). All prior exit levers (narrower fixed
 * Donchian low) failed because they whipsaw out of healthy pullbacks. This
 * tests a DIFFERENT exit mechanism: a chandelier trailing stop that rides the
 * highest close since entry minus a multiple of ATR. It adapts to volatility,
 * so it may cut deep trend-reversal drawdowns without the fixed-exit whipsaw.
 * When it buys and sells: buys a 55-day-high breakout (unless steep downtrend);
 * exits when price falls 3x ATR below the highest close since entry, or on the
 * 30-day low, or a 3x-ATR disaster stop from entry.
 * When it does NOT work: in violent single-day crashes the trailing stop can
 * gap through; in choppy sideways it still gives up gains. Higher-risk trend.
 */
function onUpdate(ctx) {
  const hh55 = ctx.high(55, 1);
  const ll30 = ctx.low(30, 1);
  const atr = ctx.atr(14, 1);
  const ema50 = ctx.ema(50, 1);
  if (hh55 == null || ll30 == null || atr == null || ema50 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;
  const st = ctx.state || {};

  if (pos > 0) {
    // disaster stop from entry
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    // trailing: highest close since entry minus 3x ATR
    let hi = st.hi != null ? st.hi : ctx.entryPx;
    if (price > hi) hi = price;
    if (price < hi - atr * 3) return { side: 'sell', qty: pos };
    ctx.state = { hi: hi };
    // original 30-day low as backstop
    if (price < ll30) return { side: 'sell', qty: pos };
    return null;
  }

  const inSteepDowntrend = price < ema50 - atr * 3;
  if (inSteepDowntrend) return null;

  if (price > hh55) {
    ctx.state = { hi: price };
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
