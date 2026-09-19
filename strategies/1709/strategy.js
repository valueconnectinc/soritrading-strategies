/*
 * @coinsori-strategy v1
 * name: Trend-Filtered BB/RSI Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: AVAXUSDT oscillates between trending and ranging phases.
 * Pure mean reversion (Exp 411) wins in bear/range but bleeds in strong uptrends.
 * Adding a trend filter (EMA9/EMA21 direction) lets us SKIP counter-trend trades
 * when the trend is strong — reducing whipsaws without giving up all mean-reversion edge.
 * When it buys and sells: Buy when RSI < 30 AND price at lower BB AND EMA9 > EMA21 (uptrend bias).
 * Sell when RSI > 70 OR price reaches middle BB. Short side: mirror when RSI > 70 AND EMA9 < EMA21.
 * When it does NOT work: In strong one-directional trends the EMA filter causes the strategy
 * to miss both the long bottom and short top — it sits out while pure momentum wins.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);
  const bb    = ctx.bb(20, 2);
  const atr   = ctx.atr(14);

  // Warm-up guard
  if (ema9 == null || ema21 == null || rsi == null || bb == null || atr == null) return null;

  // ── Regime: trend direction via EMA slope (closed bars only = stable) ───────
  const ema9_1  = ctx.ema(9,  1);
  const ema21_1 = ctx.ema(21, 1);
  if (ema9_1 == null || ema21_1 == null) return null;

  const trendUp   = ema9 > ema21 && ema9_1 <= ema21_1; // crossover just happened
  const trendDown = ema9 < ema21 && ema9_1 >= ema21_1; // crossunder just happened
  const strongUp  = ema9 > ema21 && (ema9 - ema21) / ema21 > 0.015; // 1.5% separation
  const strongDn  = ema9 < ema21 && (ema21 - ema9) / ema21 > 0.015;

  // ── Position state ──────────────────────────────────────────────────────────
  const pos = ctx.position;
  const px  = ctx.price;

  // ── Entry: Long ─────────────────────────────────────────────────────────────
  // RSI oversold + price at lower BB + (uptrend OR just crossed up)
  if (pos === 0) {
    const atLowerBB = bb.lower != null && px <= bb.lower;
    const rsiOversold = rsi < 35; // slightly tighter than 30 to reduce false signals

    if (rsiOversold && atLowerBB && (trendUp || strongUp || !strongDn)) {
      // Allow entry if not in strong downtrend
      const qty = ctx.cash / px * 0.95;
      return { side: 'buy', qty, type: 'limit', price: px };
    }

    // ── Entry: Short ──────────────────────────────────────────────────────────
    const atUpperBB = bb.upper != null && px >= bb.upper;
    const rsiOverbought = rsi > 65; // slightly tighter than 70

    if (rsiOverbought && atUpperBB && (trendDown || strongDn || !strongUp)) {
      const qty = ctx.cash / px * 0.95;
      return { side: 'sell', qty, type: 'limit', price: px };
    }
  }

  // ── Exit: Long ──────────────────────────────────────────────────────────────
  if (pos > 0) {
    // Take profit: price near middle BB or RSI normalized
    const atMiddle = bb.middle != null && px >= bb.middle * 0.97;
    const rsiNorm  = rsi > 55; // not overbought but not oversold — lock gains

    if (atMiddle || rsiNorm) {
      return { side: 'sell', qty: pos };
    }

    // Stop loss: price drops 2.5× ATR below entry (tight stop, not trailing)
    const entryPx = ctx.entryPx;
    if (entryPx != null) {
      const slPx = entryPx - 2.5 * atr;
      if (px < slPx) {
        return { side: 'sell', qty: pos }; // market stop
      }
    }
  }

  // ── Exit: Short ─────────────────────────────────────────────────────────────
  if (pos < 0) {
    const atMid = bb.middle != null && px <= bb.middle * 1.03;
    const rsiNormDn = rsi < 45;

    if (atMid || rsiNormDn) {
      return { side: 'buy', qty: Math.abs(pos) };
    }

    const entryPx = ctx.entryPx;
    if (entryPx != null) {
      const slPx = entryPx + 2.5 * atr;
      if (px > slPx) {
        return { side: 'buy', qty: Math.abs(pos) };
      }
    }
  }

  return null;
}
