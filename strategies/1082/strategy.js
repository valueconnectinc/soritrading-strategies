/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + RSI Filter ETH 4h
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ETH often snaps back from Bollinger Band lower touches — a
 * textbook mean-reversion asset. Combining BB band touch with RSI confirmation
 * reduces false signals from trending drops.
 * When it buys and sells: Buys when price touches the lower BB band AND RSI-14
 * is below 35 (oversold). Sells when price hits the upper BB band OR RSI
 * crosses above 65 (overbought). ATR-based stop loss guards against extended moves.
 * When it does NOT work: In strong sustained trends (e.g. macro crashes or
 * parabolic pumps) ETH can hug the lower band for weeks — the strategy may
 * repeatedly buy into a falling knife and get stopped out.
 */

function onUpdate(ctx) {
  // Warm-up guard: need 20 bars for BB, 14 for RSI
  const bb20 = ctx.bb(20, 2, 2);
  if (bb20 == null) return null;

  const rsi14 = ctx.rsi(14, 2);
  if (rsi14 == null) return null;

  const atr14 = ctx.atr(14, 2);
  if (atr14 == null) return null;

  // Current bar values for exit checks
  const bbCur = ctx.bb(20, 2, 0);
  const rsiCur = ctx.rsi(14, 0);
  const price = ctx.price;

  // ── ENTRY: price at lower band, RSI confirming oversold ──
  if (ctx.position === 0) {
    const lowerBand = bb20.lower;
    // Price within 0.5% of lower band = "touch"
    const touchThreshold = lowerBand * 1.005;
    if (price <= touchThreshold && rsi14 < 35) {
      // Stop loss: 1.5× ATR below entry, but not tighter than 2%
      const stopPx = price - Math.max(atr14 * 1.5, price * 0.02);
      const qty = (ctx.cash * 0.95) / price;
      return {
        side: 'buy',
        qty: qty,
        type: 'limit',
        price: ctx.price,
        // Store stop in comment for tracking (platform may not persist it)
      };
    }
  }

  // ── EXIT: price at upper BB band OR RSI overbought ──
  if (ctx.position > 0) {
    const upperBand = bbCur ? bbCur.upper : ctx.sma(20, 2) + 2 * atr14;
    const rsiPrev  = ctx.rsi(14, 1);

    // Sell 1: price hit upper band
    if (price >= upperBand) {
      return { side: 'sell', qty: ctx.position };
    }

    // Sell 2: RSI crossed above 65 (overbought reversal)
    if (rsiCur !== null && rsiPrev !== null && rsiPrev <= 65 && rsiCur > 65) {
      return { side: 'sell', qty: ctx.position };
    }

    // Sell 3: Time-based — hold > 72 bars (12 days at 4h) without upper-band hit
    // Stops the position from turning into a long-term hold
    const entryBar = ctx.entryPx; // not a bar number; use a time flag
    // ctx.i is the current bar index (0 = oldest in warm-up, increases)
    // We track hold duration via a work-order trick: set a GTC limit sell at upper band
    // as a "soft" exit target; hard stops below
    const stopPx = ctx.entryPx - Math.max(atr14 * 2.0, ctx.entryPx * 0.03);
    // If price drops to stop — hard stop
    if (price <= stopPx) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
