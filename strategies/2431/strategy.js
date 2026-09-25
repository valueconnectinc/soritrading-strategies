/*
 * @coinsori-strategy v1
 * name: ETH Donchian Channel Breakout 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Big crypto moves usually start with a decisive break out of a
 *   trading range. A Donchian channel tracks the highest high and lowest low of the
 *   last N bars; buying on a break of the upper channel catches the start of a new
 *   trend, and selling on a break of the lower channel exits when it ends. This is
 *   a breakout family, distinct from EMA crossovers.
 * When it buys and sells: Buy when the close breaks above the highest high of the
 *   last 20 bars. Sell when it breaks below the lowest low of the last 20 bars.
 * When it does NOT work: In range-bound chop, false breakouts whipsaw in and out
 *   and pay fees. Long-only, so it misses short-side gains in bear markets.
 */
function onUpdate(ctx) {
  const px = ctx.closes[ctx.closes.length - 1];
  const N = 20;
  if (ctx.closes.length < N + 2) return null;

  // Donchian channel from the previous N closed bars (exclude the forming bar).
  let hi = -Infinity, lo = Infinity;
  for (let k = 1; k <= N; k++) {
    const h = ctx.high(1, k);
    const l = ctx.low(1, k);
    if (h == null || l == null) return null;
    if (h > hi) hi = h;
    if (l < lo) lo = l;
  }

  const pos = ctx.position;

  // Exit: break below the lower channel.
  if (pos > 0) {
    if (px < lo) return { side: 'sell', qty: pos };
    return null;
  }

  // Enter: break above the upper channel.
  if (px > hi) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }

  return null;
}
