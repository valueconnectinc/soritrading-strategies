/*
 * @coinsori-strategy v1
 * name: MACD Trend + Volume Confirmation
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Pure trend-following strategy using MACD crossover for signal generation,
 * volume confirmation to filter false breakouts, and a tight ATR stop to
 * protect capital while letting winners run.
 * Buys when MACD crosses above signal line with above-average volume.
 * Sells when MACD crosses below signal line or ATR stop is hit.
 * When it underperforms: strong chop without clear trend — MACD flips repeatedly.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────
  const macdFast = 12, macdSlow = 26, macdSig = 9;

  // MACD: ago=1 = previous closed bar (stable), ago=2 = bar before
  const m1 = ctx.macd(macdFast, macdSlow, macdSig, 1);
  const m2 = ctx.macd(macdFast, macdSlow, macdSig, 2);
  if (m1 == null || m2 == null || m1.macd == null || m2.macd == null) return null;

  const atr  = ctx.atr(14, 1);
  const ema9 = ctx.ema(9, 1);
  const ema21 = ctx.ema(21, 1);
  if (atr == null || ema9 == null || ema21 == null) return null;

  // Volume confirmation: current volume vs 20-bar average
  const avgVol = ctx.avgVol(20);
  const volNow = ctx.vol;
  if (avgVol == null || volNow == null) return null;
  const volConfirm = volNow >= avgVol;

  // ── Position sizing ─────────────────────────────────────────
  // Tight stop: 1x ATR — much tighter than the 2.5x that let winners shrink
  const stopPx = ctx.price - 1.0 * atr; // hard stop below entry

  // ── Entry: MACD crosses ABOVE signal line ──────────────────
  // m2.macd <= m2.signal AND m1.macd > m1.signal = bullish crossover
  const bullishX = m2.macd <= m2.signal && m1.macd > m1.signal;

  // ── Exit: MACD crosses BELOW signal line ───────────────────
  const bearishX = m2.macd >= m2.signal && m1.macd < m1.signal;

  // ── Trade logic ─────────────────────────────────────────────
  if (ctx.position === 0) {
    // No position — look for long entry
    if (bullishX) {
      // Require volume confirmation to avoid false signals in thin volume
      if (!volConfirm) return null;
      // ATR stop: 1x ATR below entry (tight — cuts losers fast)
      return {
        side: 'buy',
        qty: ctx.cash / ctx.price * 0.99,
        type: 'limit',
        price: ctx.price,
        postOnly: true,
        // Attach stop as a work order
        trigger: { side: 'sell', type: 'stop', price: stopPx, qty: 'position' }
      };
    }
    return null;
  }

  // Have a position — exit on bearish MACD crossover
  if (bearishX) {
    return { side: 'sell', qty: ctx.position };
  }

  // Optional: time-based exit if in profit > 3% and no signal
  // (prevents holding through a reversal)
  const pnlPct = (ctx.price - ctx.entryPx) / ctx.entryPx;
  if (pnlPct > 0.03 && ema9 < ema21) {
    // Price above EMA9 but EMA9 has crossed below EMA21 = momentum fading
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
