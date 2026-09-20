/*
 * @coinsori-strategy v1
 * name: Volume-Confirmed RSI Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: Standard RSI/Bollinger mean reversion (Exp 222, 221)
 * was promising but produced many false signals in low-volume pullbacks.
 * Adding a volume filter — only acting when volume is above its 20-bar
 * average — cuts through noise: a price drop on thin volume often reverses
 * naturally, while a drop on heavy volume signals real selling pressure
 * that warrants a mean-reversion entry.
 * When it buys and sells: Buy when RSI < 35 AND price at lower BB AND
 * volume > avgVol(20). Sell when RSI > 55 OR price reaches middle BB.
 * When it does NOT work: In strong one-directional trends with high volume,
 * the strategy keeps buying the dip and getting stopped — it assumes
 * all high-volume drops are reversals, not trend continuations.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const rsi   = ctx.rsi(14);
  const bb    = ctx.bb(20, 2);
  const avgVol = ctx.avgVol(20);
  const volNow = ctx.vol;
  const atr    = ctx.atr(14);

  if (rsi == null || bb == null || avgVol == null || volNow == null || atr == null) return null;

  // ── Volume confirmation ──────────────────────────────────────────────────────
  const volConfirm = volNow >= avgVol;

  // ── Price state (previous bar close for stable signal) ───────────────────────
  const prevClose = ctx.closes[1];
  if (prevClose == null) return null;

  const px  = ctx.price;
  const pos = ctx.position;

  // ── Entry: Long ──────────────────────────────────────────────────────────────
  // RSI oversold + price at/near lower BB + above-average volume
  if (pos === 0) {
    const atLowerBB = bb.lower != null && prevClose <= bb.lower * 1.01; // 1% tolerance
    const rsiOversold = rsi < 35;

    if (rsiOversold && atLowerBB && volConfirm) {
      const qty = ctx.cash / px * 0.98;
      return { side: 'buy', qty, type: 'limit', price: px, postOnly: true };
    }
    return null;
  }

  // ── Long exit: take profit or stop ───────────────────────────────────────────
  if (pos > 0) {
    const atMiddle = bb.middle != null && prevClose >= bb.middle * 0.98;
    const rsiNormalized = rsi > 55;

    if (atMiddle || rsiNormalized) {
      return { side: 'sell', qty: pos };
    }

    // Stop loss: 2.5% fixed below entry (avoids ATR lag)
    const entryPx = ctx.entryPx;
    if (entryPx != null && px < entryPx * 0.975) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  return null;
}
