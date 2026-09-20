/*
 * @coinsori-strategy v1
 * name: ETH Volatility Squeeze Breakout
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Big crypto moves often start from a quiet squeeze — when
 * Bollinger Band width contracts, volatility is coiled and a close outside the
 * band tends to launch a trend. This is a different family (volatility breakout)
 * from the slow 200-SMA trend ride and the failed mean-reversion dip-buys.
 * When it buys and sells: buy when a close crosses above the upper Bollinger
 * band while band width is below its recent average (a squeeze); sell on a close
 * back below the 20-SMA.
 * When it does NOT work: in long choppy ranges a breakout is often a false move
 * that reverses immediately; it also misses slow steady trends that never squeeze.
 */
function bbWidth(b) {
  if (!b) return null;
  if (typeof b.upper === 'number' && typeof b.lower === 'number') return b.upper - b.lower;
  if (Array.isArray(b) && b.length >= 3 && typeof b[0] === 'number' && typeof b[2] === 'number') return b[0] - b[2];
  return null;
}

function onUpdate(ctx) {
  const pos = ctx.position;

  if (pos <= 0) {
    const cur = ctx.bb(20, 2, 1);
    const prev = ctx.bb(20, 2, 2);
    const curW = bbWidth(cur);
    const prevW = bbWidth(prev);
    if (curW == null || prevW == null) return null;

    // squeeze: current band width is below its own 20-bar average
    let sum = 0, n = 0;
    for (let a = 1; a <= 20; a++) {
      const w = bbWidth(ctx.bb(20, 2, a));
      if (w == null) continue;
      sum += w; n++;
    }
    const avgW = n > 0 ? sum / n : curW;
    const squeezed = curW <= avgW;

    const upper = typeof cur.upper === 'number' ? cur.upper : (Array.isArray(cur) ? cur[0] : null);
    const upperPrev = typeof prev.upper === 'number' ? prev.upper : (Array.isArray(prev) ? prev[0] : null);
    const closePrev = ctx.closes[ctx.closes.length - 2];
    const closePrev2 = ctx.closes[ctx.closes.length - 3];

    if (squeezed && upper != null && upperPrev != null && closePrev != null && closePrev2 != null &&
        closePrev2 <= upperPrev && closePrev > upper) {
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.98 };
    }
    return null;
  } else {
    const sma20 = ctx.sma(20, 1);
    const closePrev = ctx.closes[ctx.closes.length - 2];
    if (sma20 != null && closePrev != null && closePrev < sma20) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
