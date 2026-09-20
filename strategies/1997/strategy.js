/*
 * @coinsori-strategy v1
 * name: Funding Bias + RSI/BB Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Funding rate tells us which side is crowded (bulls or bears paying).
 * When funding is deeply negative, shorts are paying — bears are crowded, bounce likely.
 * When funding is deeply positive, longs are paying — bulls are crowded, drop likely.
 * We use funding as a SOFT BIAS (skip signal if extreme opposite) rather than a hard gate,
 * so we always generate mean-reversion trades even when funding data is unavailable.
 * When it buys and sells: Buy when RSI < 35 and price at lower BB. Funding must not be
 * strongly positive (>0.005) to avoid fading crowded longs. Sell when RSI > 65 or price
 * at middle BB or stop-loss hit.
 * When it does NOT work: In strong one-directional trends, mean reversion signals fire
 * too early and get stopped out repeatedly — the funding bias helps but cannot prevent
 * all whipsaws in extended trends.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const rsi  = ctx.rsi(14);
  const bb   = ctx.bb(20, 2);
  const atr  = ctx.atr(14);
  const funding = ctx.funding;

  // Warm-up: need RSI, BB, ATR
  if (rsi == null || bb == null || atr == null) return null;

  const pos = ctx.position;
  const px  = ctx.price;

  // ── Funding soft bias (optional — skip if extreme opposite direction) ───────
  // Skip long if funding too positive (bulls crowded, more likely to drop)
  // Skip short if funding too negative (bears crowded, more likely to bounce)
  const skipLong  = funding != null && funding > 0.005;
  const skipShort = funding != null && funding < -0.005;

  // ── Entry: Long ─────────────────────────────────────────────────────────────
  if (pos === 0) {
    const rsiOversold  = rsi < 35;
    const atLowerBB    = bb.lower != null && px <= bb.lower * 1.02;

    if (rsiOversold && atLowerBB && !skipLong) {
      const qty = ctx.cash / px * 0.95;
      return { side: 'buy', qty, type: 'limit', price: px };
    }

    // ── Entry: Short ──────────────────────────────────────────────────────────
    const rsiOverbought = rsi > 65;
    const atUpperBB     = bb.upper != null && px >= bb.upper * 0.98;

    if (rsiOverbought && atUpperBB && !skipShort) {
      const qty = ctx.cash / px * 0.95;
      return { side: 'sell', qty, type: 'limit', price: px };
    }
  }

  // ── Exit: Long ──────────────────────────────────────────────────────────────
  if (pos > 0) {
    const atMiddle = bb.middle != null && px >= bb.middle * 0.98;
    const rsiNorm  = rsi > 55;

    if (atMiddle || rsiNorm) {
      return { side: 'sell', qty: pos };
    }

    // Stop loss: 2.5× ATR below entry
    const entryPx = ctx.entryPx;
    if (entryPx != null) {
      const slPx = entryPx - 2.5 * atr;
      if (px < slPx) {
        return { side: 'sell', qty: pos };
      }
    }
  }

  // ── Exit: Short ─────────────────────────────────────────────────────────────
  if (pos < 0) {
    const atMid = bb.middle != null && px <= bb.middle * 1.02;
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
