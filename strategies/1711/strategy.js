/*
 * @coinsori-strategy v1
 * name: Volatility Contraction Breakout v2
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buy when Bollinger Bandwidth squeezes below 75% of its recent average and
 * price breaks above the upper band. Sell when price reaches the lower band
 * or hits the 2× ATR stop. This bets on the compression→expansion cycle.
 * When it does NOT work: in strong trends without compression phases,
 * or when AVAX gaps overnight past the stop without forming bars.
 */
function onUpdate(ctx) {
  const bb    = ctx.bb(20, 2, 0);
  const rsi   = ctx.rsi(14, 0);
  const atr   = ctx.atr(14, 0);
  const price = ctx.price;

  if (bb == null || rsi == null || atr == null) return null;

  // BB Width — measure of volatility contraction
  const bwCur = (bb.upper - bb.lower) / bb.mid;
  // Average bandwidth over closed bars (ago 1-5, all safe to read)
  const arr = [1,2,3,4,5].map(n => {
    const b = ctx.bb(20, 2, n);
    return b ? (b.upper - b.lower) / b.mid : null;
  }).filter(v => v != null);
  const bwAvg = arr.length > 0 ? arr.reduce((s,v) => s+v, 0) / arr.length : null;
  const bwRatio = bwAvg > 0 ? bwCur / bwAvg : null;

  // Volume ratio (current vs 20-bar avg)
  const volAvg = ctx.avgVol(20);
  const volRatio = (volAvg > 0 && ctx.vol > 0) ? ctx.vol / volAvg : null;

  if (bwRatio == null) return null;

  const hasLong  = ctx.position > 0;
  const hasShort = ctx.position < 0;
  const slDist   = atr * 2; // 2× ATR stop distance

  // ── ENTRY: Long ─────────────────────────────────────────────
  // Condition: squeeze (bandwidth < 75% of avg) + price above upper band
  // RSI filter: not overbought, leaves room for more upside
  // Volume confirmation (optional — don't block if vol unknown)
  if (!hasLong && !hasShort && bwRatio < 0.75) {
    const upperBB = bb.upper;
    const volOk = volRatio == null || volRatio >= 1.2;
    if (price > upperBB && rsi < 80 && volOk) {
      return { side: 'buy', qty: ctx.cash / price * 0.95 };
    }
  }

  // ── ENTRY: Short ────────────────────────────────────────────
  if (!hasLong && !hasShort && bwRatio < 0.75) {
    const lowerBB = bb.lower;
    const volOk = volRatio == null || volRatio >= 1.2;
    if (price < lowerBB && rsi > 20 && volOk) {
      return { side: 'sell', qty: Math.abs(ctx.cash / price * 0.95) };
    }
  }

  // ── EXIT: Long ──────────────────────────────────────────────
  if (hasLong) {
    const entry = ctx.entryPx;
    const pnlPct = (price - entry) / entry * 100;

    // TP: price reached lower band (full expansion caught)
    if (price <= bb.lower) {
      return { side: 'sell', qty: ctx.position };
    }

    // Trailing: lock in 3× ATR profit
    if (pnlPct >= 3 * atr / entry * 100) {
      const trail = price - atr * 1.5;
      if (trail > entry * 1.01) return { side: 'sell', qty: ctx.position };
    }

    // SL: 2× ATR below entry
    if (price <= entry - slDist) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // ── EXIT: Short ─────────────────────────────────────────────
  if (hasShort) {
    const entry = ctx.entryPx;
    const pnlPct = (entry - price) / entry * 100;

    if (price >= bb.upper) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }

    if (pnlPct >= 3 * atr / entry * 100) {
      const trail = price + atr * 1.5;
      if (trail < entry * 0.99) return { side: 'buy', qty: Math.abs(ctx.position) };
    }

    if (price >= entry + slDist) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
  }

  return null;
}
