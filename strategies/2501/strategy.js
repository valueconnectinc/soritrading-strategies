/*
 * @coinsori-strategy v1
 * name: BTC 1D Donchian Breakout Trend-Following
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Donchian breakout is a classic trend-following family —
 *   buy when price breaks a fresh 20-day high, ride the new trend. This is the
 *   opposite of the mean-reversion champion and enters FASTER than the laggy
 *   100-day SMA crossover that failed (it missed BTC's steady rallies). A
 *   breakout-based entry should capture those sustained moves earlier.
 * When it buys and sells: Buy when the close makes a new 20-day high. Sell when
 *   the close makes a new 10-day low (trend broke) or on a 15% trailing stop.
 * When it does NOT work: In choppy sideways ranges breakouts whipsaw and churn
 *   fees. It also buys extended tops late in a run and can give back gains on
 *   sharp reversals before the 10-day-low exit triggers.
 */
function onUpdate(ctx) {
  // 20-day high = highest close of the previous 20 bars (exclude current)
  let hi20 = null;
  for (let i = 1; i <= 20; i++) {
    const c = ctx.closes[ctx.closes.length - 1 - i];
    if (c == null) return null;
    if (hi20 == null || c > hi20) hi20 = c;
  }
  let lo10 = null;
  for (let i = 1; i <= 10; i++) {
    const c = ctx.closes[ctx.closes.length - 1 - i];
    if (c == null) return null;
    if (lo10 == null || c < lo10) lo10 = c;
  }

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // trailing stop or trend broke to a 10-day low
    if (price < ctx.entryPx * 0.85) return { side: 'sell', qty: pos };
    if (price < lo10) return { side: 'sell', qty: pos };
    return null;
  }

  // fresh 20-day high breakout
  if (price > hi20) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
