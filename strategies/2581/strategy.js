/*
 * @coinsori-strategy v1
 * name: Donchian Binary Vol-Adaptive Size BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated defensive Donchian (55d-high entry, 30d-low
 * exit, 3x-ATR stop, EMA50 filter) with BINARY vol-adaptive sizing: halve the
 * position when daily ATR >= 5% of price (elevated-vol regime), full position
 * otherwise. This is the reference version used to judge whether the continuous
 * vol-target curve is a real improvement on the same windows.
 * When it buys and sells: same 55d-high breakout entry (unless steep downtrend),
 * same 30d-low / 3x-ATR exit — only the size flips between 0.5 and 0.99.
 * When it does NOT work: in a sustained calm bull it is fully invested like the
 * baseline, inheriting its bull-underperformance; and if a crash arrives without
 * a prior volatility rise, the sizing does not help.
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
    const volRatio = atr / price;
    const size = volRatio >= 0.05 ? 0.5 : 0.99;
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
