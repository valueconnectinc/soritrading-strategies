/*
 * @coinsori-strategy v1
 * name: Low-Frequency EMA Trend + RSI Confluence
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOLUSDT 4h has been tested extensively (experiments 472, 490, 491, 492, 506)
 * and ALL strategies failed or were inconclusive due to over-trading (22-33 trades per 500 bars).
 * The root cause: loose entry conditions trigger on every small pullback.
 * This strategy uses STRICTER filters — longer EMAs and tighter RSI bands — to reduce
 * trade frequency to ~3-6 trades per window, matching what worked on AVAXUSDT.
 * When it buys and sells: Long when EMA50 > EMA200 (confirmed uptrend) AND RSI crosses below 40
 * (oversold pullback entry). Exit when RSI crosses above 55 OR price drops 3× ATR from entry.
 * Short when EMA50 < EMA200 (confirmed downtrend) AND RSI crosses above 60 (overbought bounce).
 * Exit when RSI crosses below 45 OR price rises 3× ATR from entry.
 * When it does NOT work: In choppy markets where EMA50 oscillates around EMA200, this generates
 * zero or very few trades — opportunity cost vs hold. In strong parabolic moves, the RSI never
 * reaches oversold, so entries are missed entirely.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const ema50  = ctx.ema(50);
  const ema200 = ctx.ema(200);
  const rsi    = ctx.rsi(14);
  const atr    = ctx.atr(14);

  // Warm-up guard — EMA200 needs ~200 bars on 4h, but we guard anyway
  if (ema50 == null || ema200 == null || rsi == null || atr == null) return null;

  // ── Previous bar values for crossover detection ─────────────────────────────
  const ema50_1  = ctx.ema(50,  1);
  const ema200_1 = ctx.ema(200, 1);
  const rsi_1    = ctx.rsi(14, 1);
  if (ema50_1 == null || ema200_1 == null || rsi_1 == null) return null;

  // ── Regime: EMA50 above/below EMA200 = confirmed trend ───────────────────────
  const bullTrend  = ema50 > ema200;
  const bearTrend  = ema50 < ema200;
  const bullCross  = !bullTrend  && ema50_1 <= ema200_1 && ema50 > ema200; // just flipped bull
  const bearCross  = !bearTrend && ema200_1 <= ema50_1  && ema50 < ema200; // just flipped bear

  const pos = ctx.position;
  const px  = ctx.price;

  // ── Entry: Long ─────────────────────────────────────────────────────────────
  // Buy when in bull trend AND RSI drops into oversold zone (pullback entry)
  if (pos === 0) {
    const rsiCrossUp = rsi_1 < 40 && rsi >= 40; // RSI just crossed above 40 from below
    const rsiDeep    = rsi < 35;                 // already deep oversold (safety net)

    if ((rsiCrossUp || rsiDeep) && (bullTrend || bullCross)) {
      const qty = ctx.cash / px * 0.95;
      return { side: 'buy', qty, type: 'limit', price: px };
    }

    // ── Entry: Short ──────────────────────────────────────────────────────────
    const rsiCrossDn = rsi_1 > 60 && rsi <= 60; // RSI just crossed below 60 from above
    const rsiDeepDn  = rsi > 65;                // already deep overbought

    if ((rsiCrossDn || rsiDeepDn) && (bearTrend || bearCross)) {
      const qty = ctx.cash / px * 0.95;
      return { side: 'sell', qty, type: 'limit', price: px };
    }
  }

  // ── Exit: Long ──────────────────────────────────────────────────────────────
  if (pos > 0) {
    const rsiCrossUp2 = rsi_1 < 55 && rsi >= 55; // RSI recovering = take profit signal
    const rsiStrong   = rsi > 65;                // overbought — lock in gains

    if (rsiCrossUp2 || rsiStrong) {
      return { side: 'sell', qty: pos };
    }

    // Stop loss: 3× ATR below entry (wider than previous failed 1×-2.5× attempts)
    const entryPx = ctx.entryPx;
    if (entryPx != null) {
      const slPx = entryPx - 3.0 * atr;
      if (px < slPx) {
        return { side: 'sell', qty: pos };
      }
    }
  }

  // ── Exit: Short ─────────────────────────────────────────────────────────────
  if (pos < 0) {
    const rsiCrossDn2 = rsi_1 > 45 && rsi <= 45;
    const rsiWeak     = rsi < 35;

    if (rsiCrossDn2 || rsiWeak) {
      return { side: 'buy', qty: Math.abs(pos) };
    }

    const entryPx = ctx.entryPx;
    if (entryPx != null) {
      const slPx = entryPx + 3.0 * atr;
      if (px > slPx) {
        return { side: 'buy', qty: Math.abs(pos) };
      }
    }
  }

  return null;
}
