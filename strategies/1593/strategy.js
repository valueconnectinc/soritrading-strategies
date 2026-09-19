/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion SOL 1h
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 10000
 *
 * Bollinger Band mean reversion with RSI confirmation on SOL 1h.
 * SOL's high volatility creates frequent overshoots beyond the BB bands.
 * When price reverts from the lower band with RSI confirming oversold,
 * the strategy buys — betting on mean reversion back to the middle band.
 * Exits when price reaches the middle band or upper band (take profit).
 * When it buys and sells: buys when price touches/reverts from the lower BB band
 * AND RSI < 35 (confirmed oversold). Sells when price reaches the middle BB band
 * or upper band. Stops out if RSI climbs above 70 (momentum exhaustion, not a buy).
 * When it does NOT work: fails in strong trending markets — if SOL breaks lower
 * band and keeps falling (no reversion), the stop loss triggers repeatedly.
 * Also fails in low-volatility squeeze periods where BB narrows and signals whipsaw.
 */

function onUpdate(ctx) {
  // Warm-up: need enough bars for BB(20) and RSI(14)
  const bb = ctx.bb(20, 2, 1);
  if (bb == null) return null;
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;

  // Current bar values for signal checks
  const price = ctx.price;
  const lower = bb.lower;
  const mid   = bb.mid;
  const upper = bb.upper;

  // === EXIT LOGIC ===
  // If in position: take profit at mid band or upper band
  if (ctx.position > 0) {
    // Take profit at middle band (safe) or upper band (aggressive)
    const tpMid   = mid;
    const tpUpper = upper;
    // Prefer mid-band exit; only hold to upper if RSI still bullish
    if (price >= tpMid) {
      // Reasonable take profit: mid band or upper if RSI > 60
      if (price >= tpUpper || rsi > 60) {
        return { side: 'sell', qty: ctx.position };
      }
      return { side: 'sell', qty: ctx.position };
    }
    // Stop out if RSI climbs above 70 without reaching target (momentum exhaustion)
    if (rsi > 70) {
      return { side: 'sell', qty: ctx.position };
    }
    return null;
  }

  // === ENTRY LOGIC ===
  // Buy when price is at or below lower BB band AND RSI is oversold (< 35)
  // This is a mean reversion setup: price overshot, should bounce back
  if (price <= lower && rsi < 35) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }

  // Alternative: price just bounced off lower band (was below, now above)
  // Check previous bar to detect the bounce
  const closes = ctx.closes;
  if (closes && closes.length >= 2) {
    const prevClose = closes[1]; // ago=1
    if (prevClose < lower && price >= lower && price < mid && rsi < 40) {
      // Bounce detected: previous bar closed below lower band, now above it
      // RSI still below 40 confirms the bounce hasn't exhausted yet
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }
  }

  return null;
}
