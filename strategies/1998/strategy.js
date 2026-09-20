/*
 * @coinsori-strategy v1
 * name: Stochastic + BB Mean Reversion with Volume
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Stochastic %K/%D crossover catches reversals faster than RSI
 * by measuring position within the recent high-low range. Combined with Bollinger
 * Bands for price extremes and volume confirmation to avoid weak signals, this
 * is a different indicator family from the RSI+BB strategy that worked on AVAX.
 * Funding rate acts as a soft bias to avoid crowded trades.
 * When it buys and sells: Buy when stochastic %K crosses above %D while both are
 * below 20 (oversold), price touches lower BB, and volume spikes. Sell when %K
 * crosses below %D above 80 (overbought), price touches upper BB, and volume spikes.
 * When it does NOT work: In fast trending markets, stochastic can stay extended
 * for many bars — the volume filter helps but cannot prevent all whipsaws in
 * strong one-directional moves.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const stoch = ctx.stoch(14, 3);   // stochastic %K, %D (n=14, d=3)
  const bb    = ctx.bb(20, 2);
  const atr   = ctx.atr(14);
  const rsi   = ctx.rsi(14);
  const avgVol = ctx.avgVol(20);    // 20-bar avg volume
  const funding = ctx.funding;

  // Warm-up: need stoch, BB, ATR, RSI, volume
  if (stoch == null || bb == null || atr == null || rsi == null || avgVol == null) return null;

  const pos = ctx.position;
  const px  = ctx.price;
  const vol = ctx.vol;

  // ── Funding soft bias (skip if extreme opposite) ────────────────────────────
  // Skip long if funding strongly positive (longs crowded, more likely to drop)
  // Skip short if funding strongly negative (shorts crowded, more likely to bounce)
  const skipLong  = funding != null && funding > 0.005;
  const skipShort = funding != null && funding < -0.005;

  // ── Volume confirmation: current vol must exceed 20-bar avg by 20% ──────────
  // This filters weak signals that lack conviction
  const volConfirm = avgVol > 0 && vol >= avgVol * 1.2;

  // ── Entry: Long ─────────────────────────────────────────────────────────────
  if (pos === 0) {
    // Stochastic bullish crossover: %K crosses above %D while both oversold
    const stochOversold = stoch.k < 20 && stoch.d < 20;
    const stochCrossUp  = stoch.k > stoch.d;
    // Confirm with previous bar: %K was at or below %D
    const stochPrev = ctx.stoch(14, 3, 1);
    const stochBullish = stochPrev != null && stochPrev.k <= stochPrev.d && stochCrossUp;
    // Price at lower BB
    const atLowerBB = bb.lower != null && px <= bb.lower * 1.02;
    // RSI confirmation (not overbought)
    const rsiOk = rsi < 50;

    if (stochBullish && stochOversold && atLowerBB && rsiOk && !skipLong) {
      // Only require volume if available and meaningful
      const entryCond = volConfirm || (avgVol > 0 && vol >= avgVol * 0.8);
      if (entryCond) {
        const qty = ctx.cash / px * 0.95;
        return { side: 'buy', qty, type: 'limit', price: px };
      }
    }
  }

  // ── Entry: Short ───────────────────────────────────────────────────────────
  if (pos === 0) {
    // Stochastic bearish crossover: %K crosses below %D while both overbought
    const stochOverbought = stoch.k > 80 && stoch.d > 80;
    const stochCrossDown  = stoch.k < stoch.d;
    const stochPrev = ctx.stoch(14, 3, 1);
    const stochBearish = stochPrev != null && stochPrev.k >= stochPrev.d && stochCrossDown;
    // Price at upper BB
    const atUpperBB = bb.upper != null && px >= bb.upper * 0.98;
    // RSI confirmation (not oversold)
    const rsiOkDn = rsi > 50;

    if (stochBearish && stochOverbought && atUpperBB && rsiOkDn && !skipShort) {
      const entryCond = volConfirm || (avgVol > 0 && vol >= avgVol * 0.8);
      if (entryCond) {
        const qty = ctx.cash / px * 0.95;
        return { side: 'sell', qty, type: 'limit', price: px };
      }
    }
  }

  // ── Exit: Long ──────────────────────────────────────────────────────────────
  if (pos > 0) {
    // Exit if stochastic normalizes (cross back down) or price reaches middle BB
    const stochPrev = ctx.stoch(14, 3, 1);
    const stochExit = stochPrev != null && stoch.k < stoch.d && stochPrev.k >= stochPrev.d;
    const atMiddle  = bb.middle != null && px >= bb.middle * 0.98;
    const rsiExit   = rsi > 55;

    if (stochExit || atMiddle || rsiExit) {
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
    const stochPrev = ctx.stoch(14, 3, 1);
    const stochExitUp = stochPrev != null && stoch.k > stoch.d && stochPrev.k <= stochPrev.d;
    const atMid   = bb.middle != null && px <= bb.middle * 1.02;
    const rsiExitDn = rsi < 45;

    if (stochExitUp || atMid || rsiExitDn) {
      return { side: 'buy', qty: Math.abs(pos) };
    }

    // Stop loss: 2.5× ATR above entry
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
