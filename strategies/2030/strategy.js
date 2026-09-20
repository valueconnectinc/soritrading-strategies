/*
 * @coinsori-strategy v1
 * name: EMA Momentum 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossovers on 4H give fewer but stronger trend
 * signals than 1H. The 8/21 EMA combination catches medium-term trends
 * while filtering out intraday noise. RSI confirmation avoids buying into
 * overbought rallies that immediately reverse.
 * When it buys and sells: Buy when EMA8 crosses above EMA21 AND RSI(14) > 45
 * (not overbought). Sell when EMA8 crosses below EMA21 OR RSI > 70 OR
 * price drops 4% below entry (trailing stop).
 * When it does NOT work: In choppy markets EMA flips back and forth,
 * generating whipsaws. Also underperforms buy&hold in sustained bull runs
 * where the RSI filter causes late entries.
 */

function onUpdate(ctx) {
  const ema8  = ctx.ema(8);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);

  if (ema8 == null || ema21 == null || rsi == null) return null;

  // Previous bar values for crossover detection
  const ema8_1  = ctx.ema(8,  1);
  const ema21_1 = ctx.ema(21, 1);
  if (ema8_1 == null || ema21_1 == null) return null;

  const pos = ctx.position;
  const px  = ctx.price;

  // ── Crossover signals ─────────────────────────────────────────────────────────
  const bullCross = ema8_1 <= ema21_1 && ema8 > ema21;   // EMA8 just crossed above EMA21
  const bearCross = ema8_1 >= ema21_1 && ema8 < ema21;   // EMA8 just crossed below EMA21

  // ── Entry: Long ───────────────────────────────────────────────────────────────
  if (pos === 0) {
    // Buy on bullish crossover + RSI confirming momentum (not overbought)
    if (bullCross && rsi > 45) {
      const qty = ctx.cash / px * 0.99;
      return { side: 'buy', qty, type: 'limit', price: px, postOnly: true };
    }
    return null;
  }

  // ── Long exit ─────────────────────────────────────────────────────────────────
  if (pos > 0) {
    // Exit on bearish crossover
    if (bearCross) {
      return { side: 'sell', qty: pos };
    }
    // Or if RSI goes deeply overbought
    if (rsi > 75) {
      return { side: 'sell', qty: pos };
    }
    // Trailing stop: 4% below highest price since entry
    const entryPx = ctx.entryPx;
    if (entryPx != null) {
      const highSinceEntry = ctx.state.highSinceEntry || px;
      ctx.state.highSinceEntry = Math.max(highSinceEntry, px);
      const stopPx = ctx.state.highSinceEntry * 0.96; // 4% trailing stop
      if (px < stopPx) {
        ctx.state.highSinceEntry = px; // reset on exit
        return { side: 'sell', qty: pos };
      }
    }
    return null;
  }

  return null;
}
