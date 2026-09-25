/*
 * @coinsori-strategy v1
 * name: ETH 1D Volume-Confirmed Momentum
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Momentum family, but with a volume-confirmation filter
 *   that the failed Donchian breakout lacked. A new 20-day high is only bought
 *   when volume is well above its average — real participation, not a low-volume
 *   spike. The idea: genuine breakouts with heavy volume tend to persist, while
 *   low-volume pops reverse. Different family from the mean-reversion champion.
 * When it buys and sells: Buy when the close makes a new 20-day high AND today's
 *   volume is above 1.5x its 50-day average. Sell when the close makes a new
 *   10-day low or on a 15% trailing stop.
 * When it does NOT work: In choppy ranges, even volume-confirmed breakouts
 *   whipsaw and churn fees. It also misses steady grind-ups that never print a
 *   high-volume breakout, and can buy extended tops late in a run.
 */
function onUpdate(ctx) {
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
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(50);
  if (vol == null || avgVol == null) return null;

  if (pos > 0) {
    if (price < ctx.entryPx * 0.85) return { side: 'sell', qty: pos };
    if (price < lo10) return { side: 'sell', qty: pos };
    return null;
  }

  // fresh 20-day high WITH above-average volume (real participation)
  if (price > hi20 && vol > avgVol * 1.5) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
