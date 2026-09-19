/*
 * @coinsori-strategy v1
 * name: BB+ATR Mean Reversion Tight Stop (SOLUSDT)
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when price touches the lower Bollinger Band (mean reversion).
 * ATR filter avoids entries in choppy, low-momentum markets.
 * ATR trailing stop is TIGHTER (1.5×) to lock in profits faster.
 * Mid-band exit takes profit when price mean-reverts.
 * When it fails: strong trending markets; assets too volatile for BB bands.
 */
function onUpdate(ctx) {
  const bb   = ctx.bb(20, 2);
  const atr  = ctx.atr(14);
  const atr1 = ctx.atr(14, 1);

  if (bb == null || atr == null || atr1 == null) return null;

  const price    = ctx.price;
  const lower    = bb.lower;
  const mid      = bb.mid;
  const position = ctx.position;

  // Price touches lower BB + ATR rising = valid mean-reversion setup
  if (position === 0 && price <= lower && atr > atr1) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ATR trailing stop — tighter (1.5×) to protect profits
  if (position > 0) {
    if (entryPrice === null) entryPrice = ctx.entryPx;

    const trailStop = entryPrice - 1.5 * atr;

    if (price <= trailStop) {
      entryPrice = null;
      return { side: 'sell', qty: position };
    }

    // Mid-band exit: mean reversion complete
    if (price >= mid) {
      entryPrice = null;
      return { side: 'sell', qty: position };
    }
  }

  return null;
}

var entryPrice = null;
