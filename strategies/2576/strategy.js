/*
 * @coinsori-strategy v1
 * name: BTC Deep-Correction Dip-Buy 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's history is punctuated by deep bear-market corrections
 * that eventually recover. This is a pure-price mean-reversion family: buy only
 * after an EXTREME correction, ride the recovery. Opposite of the trend-following
 * Donchian champion — buys weakness instead of strength.
 * When it buys and sells: buys when price has fallen ~45% below its 250-day high
 * AND shows a bounce (price above its 5-bar-ago level); sells when price recovers
 * to its 200-day EMA or after a further drop to 50% below the high (thesis broken).
 * When it does NOT work: prolonged bear markets that keep falling past the stop,
 * or a correction that never reaches the extreme 45% entry (strategy sits in cash).
 */
function onUpdate(ctx) {
  const hh250 = ctx.high(250, 1);
  const ema200 = ctx.ema(200, 1);
  const pPrev5 = ctx.closes[ctx.i - 5];
  if (hh250 == null || ema200 == null || pPrev5 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= hh250 * 0.50) return { side: 'sell', qty: pos };
    if (price >= ema200) return { side: 'sell', qty: pos };
    return null;
  }

  // Extreme correction (45% below 250d high) AND a bounce started.
  if (price <= hh250 * 0.55 && price > pPrev5) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
