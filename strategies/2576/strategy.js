/*
 * @coinsori-strategy v1
 * name: BTC Deep-Correction Dip-Buy 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's history is punctuated by deep bear-market corrections
 * (30-50% drops from cycle highs) that eventually recover. This is a pure-price
 * mean-reversion family: buy only after a deep correction, ride the recovery.
 * It is the opposite of the trend-following Donchian champion — it buys weakness
 * instead of strength, so it is a genuinely different strategy family.
 * When it buys and sells: buys when price has fallen ~35% below its 250-day high
 * AND shows a bounce (price above its 5-day-ago level, so we catch the turn, not
 * the falling knife); sells when price recovers to its 200-day EMA (uptrend
 * restored) or after a further 50% drop from the high (thesis broken).
 * When it does NOT work: prolonged bear markets that keep falling past the stop,
 * or a shallow correction that never reaches the 35% entry (strategy sits in cash).
 */
function onUpdate(ctx) {
  const hh250 = ctx.high(250, 1);
  const ema200 = ctx.ema(200, 1);
  const p5 = ctx.price; // current
  const pPrev5 = ctx.closes[ctx.i - 5]; // 5 bars ago
  if (hh250 == null || ema200 == null || pPrev5 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= hh250 * 0.50) return { side: 'sell', qty: pos };
    if (price >= ema200) return { side: 'sell', qty: pos };
    return null;
  }

  // Deep correction (35% below 250d high) AND a bounce started (price now above
  // its level 5 bars ago) -> catch the turn, avoid repeated falling-knife buys.
  if (price <= hh250 * 0.65 && price > pPrev5) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
