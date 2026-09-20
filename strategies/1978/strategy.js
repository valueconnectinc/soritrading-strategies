/*
 * @coinsori-strategy v1
 * name: RSI + Volume Confirmation Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: AVAXUSDT oscillates between trending and ranging phases.
 * RSI mean reversion signals are reliable in chop but generate false signals in
 * low-volume wash-outs. Adding a volume spike filter — requiring above-average
 * volume on the RSI oversold signal — ensures entries coincide with real
 * directional conviction rather than thin-volume noise.
 * When it buys and sells: Buy when RSI < 35 AND volume > 1.2× its 20-bar average
 * (volume confirmation of the oversold bounce). Sell when RSI > 55 or stop-loss.
 * When it does NOT work: In slow grinding uptrends with persistent elevated volume,
 * RSI never reaches 35 and the strategy sits out entirely — missing steady gains.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const rsi   = ctx.rsi(14);
  const atr   = ctx.atr(14);
  const vol   = ctx.vol;
  const avgVol = ctx.avgVol(20); // 20-bar average volume

  // Warm-up guard
  if (rsi == null || atr == null || vol == null || avgVol == null || avgVol === 0) return null;

  // ── Volume confirmation: spike means conviction, not just noise ─────────────
  const volSpike = vol > avgVol * 1.2; // 20% above average = genuine move

  // ── Position state ──────────────────────────────────────────────────────────
  const pos = ctx.position;
  const px  = ctx.price;

  // ── Entry: Long ─────────────────────────────────────────────────────────────
  if (pos === 0) {
    // RSI oversold + volume confirmation = high-quality bounce signal
    if (rsi < 35 && volSpike) {
      const qty = ctx.cash / px * 0.95;
      return { side: 'buy', qty, type: 'limit', price: px };
    }

    // Short entry: RSI overbought + volume confirmation
    if (rsi > 65 && volSpike) {
      const qty = ctx.cash / px * 0.95;
      return { side: 'sell', qty, type: 'limit', price: px };
    }
  }

  // ── Exit: Long ──────────────────────────────────────────────────────────────
  if (pos > 0) {
    // Take profit: RSI normalized
    if (rsi > 55) {
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
    // Take profit: RSI normalized
    if (rsi < 45) {
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
