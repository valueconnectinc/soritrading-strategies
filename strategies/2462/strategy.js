/*
 * @coinsori-strategy v1
 * name: ETH 1D RSI2 Capitulation Bounce
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Extreme short-term oversold readings on a major asset
 *   (RSI2 below ~10) mark short-lived capitulation that historically snaps
 *   back over the following days. This is the opposite family to the trend
 *   breakout champion — it buys fear instead of strength, so it tends to have
 *   low drawdown because entries are already at a local bottom.
 * When it buys and sells: Buy when the 2-bar RSI drops below a deep oversold
 *   level. Sell when price recovers to a modest profit target or when a short
 *   time has passed and the bounce has not materialized.
 * When it does NOT work: In a sustained bear market the "bounce" keeps failing
 *   and each dip-buy is a falling knife — drawdown accumulates. It also makes
 *   few trades, so fees are low but so is the number of chances.
 */
function onUpdate(ctx) {
  const r = ctx.rsi(2, 1);
  if (r == null) return null;
  const price = ctx.price;
  const pos = ctx.position;
  const s = ctx.state;

  if (pos > 0) {
    const entry = s.entryPx != null ? s.entryPx : ctx.entryPx;
    if (entry == null) return null;
    // Take profit at +8% or cut at -5%; also exit after 10 bars if flat.
    const ret = (price - entry) / entry;
    if (ret >= 0.08) return { side: 'sell', qty: pos };
    if (ret <= -0.05) return { side: 'sell', qty: pos };
    if (s.barsHeld == null) s.barsHeld = 0;
    s.barsHeld += 1;
    if (s.barsHeld >= 10) return { side: 'sell', qty: pos };
    return null;
  }

  // Deep oversold entry: RSI(2) below 10 on the closed prior bar.
  if (r < 10) {
    s.entryPx = price;
    s.barsHeld = 0;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
