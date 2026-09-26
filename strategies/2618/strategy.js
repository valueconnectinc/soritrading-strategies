/*
 * @coinsori-strategy v1
 * name: Bollinger Panic-Bottom Mean Reversion BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Sharp single-bar collapses below the lower Bollinger
 * band are panic capitulation — the market overshoots to the downside and
 * tends to snap back toward the mean. Buying these extreme overextensions
 * captures the bounce while staying in cash most of the time.
 * When it buys and sells: buys when price closes below the lower Bollinger
 * band; exits when price recovers to the middle band or on a 2x-ATR stop.
 * When it does NOT work: in sustained bear markets the "panic" keeps
 * falling (no snap-back) and each buy is a falling knife; in strong chop
 * the band-break gives false signals that fade both ways.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  if (bb == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // exit at mean reversion (recover to middle band) or 2x-ATR stop
    if (price >= bb.middle) return { side: 'sell', qty: pos };
    if (price <= ctx.entryPx - atr * 2) return { side: 'sell', qty: pos };
    return null;
  }

  // buy the panic: close below the lower Bollinger band
  if (price < bb.lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
