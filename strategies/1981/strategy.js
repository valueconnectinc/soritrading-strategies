/*
 * @coinsori-strategy v1
 * name: BB Stoch Dual Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Combines Bollinger Bands and Stochastic Oscillator for mean reversion entries.
 * Why this strategy: Both BB and Stochastic individually showed alpha on AVAXUSDT 4h
 * (bear/chop windows). Dual confirmation should filter out weaker signals and
 * improve win rate vs either indicator alone.
 * When it buys and sells: Buy when price touches BB lower band AND Stochastic %K
 * is deeply oversold (< 20). Sell when price reaches BB middle band OR %K crosses
 * above 50. Reverse for shorts.
 * When it does NOT work: In strong one-directional trends (bull runs) — both
 * indicators will fight the trend and miss upside; benchmark will outperform.
 */
function onUpdate(ctx) {
  // Bollinger Bands: period 20, 2 std devs
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;
  const { lower, mid, upper } = bb;

  // Stochastic: 14 period, 3 smoothing
  const stoch = ctx.stoch(14, 3);
  if (stoch == null) return null;
  const k = stoch.k;
  const d = stoch.d;
  if (k == null || d == null) return null;

  // Read closed-bar values for crossover detection
  const k1 = ctx.stoch(14, 3, 1);
  const k2 = ctx.stoch(14, 3, 2);
  if (k1 == null || k2 == null || k1.k == null || k2.k == null) return null;

  const kNow = k;
  const kPrev = k1.k;
  const kPrev2 = k2.k;

  // ── ENTRY CONDITIONS ──────────────────────────────────────────────────────
  // Long: price at/below BB lower band AND Stochastic deeply oversold (< 20)
  // %K must be rising from below (confirming bounce)
  const longEntry =
    ctx.price <= lower &&
    kNow < 20 &&
    kPrev < kPrev2; // still descending or just turning — bounce not confirmed yet
  // Use %K crossover above its own prior value as entry trigger
  const longTrigger = ctx.price <= lower && kNow < 20 && kPrev <= kPrev2 && kNow > kPrev;

  // Short: price at/above BB upper band AND Stochastic deeply overbought (> 80)
  const shortEntry =
    ctx.price >= upper &&
    kNow > 80 &&
    kPrev >= kPrev2; // still rising or just turning
  const shortTrigger =
    ctx.price >= upper && kNow > 80 && kPrev >= kPrev2 && kNow < kPrev;

  // ── EXIT CONDITIONS ──────────────────────────────────────────────────────
  // Long exit: price reaches BB middle band OR %K crosses above 50
  const longExit =
    (ctx.price >= mid) ||
    (kPrev <= 50 && kNow > 50);

  // Short exit: price reaches BB middle band OR %K crosses below 50
  const shortExit =
    (ctx.price <= mid) ||
    (kPrev >= 50 && kNow < 50);

  // ── POSITION MANAGEMENT ──────────────────────────────────────────────────
  if (ctx.position === 0) {
    if (longTrigger) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    if (shortTrigger) {
      return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  if (ctx.position > 0 && longExit) {
    return { side: 'sell', qty: ctx.position };
  }

  if (ctx.position < 0 && shortExit) {
    return { side: 'buy', qty: Math.abs(ctx.position) };
  }

  return null;
}
