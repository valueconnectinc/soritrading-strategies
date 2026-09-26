/*
 * @coinsori-strategy v1
 * name: Donchian Vol-Adaptive Size BTC 1D (thr6)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Threshold-sensitivity test of the vol-adaptive sizing on
 * the defensive Donchian — same logic but the halving threshold is 6% ATR/price
 * instead of 5%, to check the improvement is not an overfit to one cutoff.
 * When it buys and sells: 55d-high breakout entry, 30d-low / 3x-ATR exit, half
 * position when daily ATR >= 6% of price.
 * When it does NOT work: same as baseline — inherits bull-underperformance and
 * does not help if a crash arrives without a prior volatility rise.
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
    const size = volRatio >= 0.06 ? 0.5 : 0.99;
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
