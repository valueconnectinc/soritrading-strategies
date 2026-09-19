/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion — LINKUSDT 4H
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean reversion on Bollinger Bands: buys when price touches the lower
 * band (2 SD below 20-period SMA) with RSI < 35 (deeply oversold),
 * betting on a bounce to the middle band. Sells when price reaches the
 * middle band or RSI > 58. Stop at 2% below entry.
 * Works in ranging/choppy markets where price oscillates around the mean.
 * Fails in strong trends — price can stay at the lower band for weeks,
 * and a "bounce" that never comes wipes out the position.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Indicators (previous closed bar) ──────────────────────────────
  const bb    = ctx.bb(20, 2, 1);   // { lower, mid, upper }
  const rsi   = ctx.rsi(14, 1);
  const atr   = ctx.atr(14, 1);
  if (bb == null || rsi == null || atr == null) return null;
  const lower = bb.lower;
  const mid   = bb.mid;
  const upper = bb.upper;

  // ── Volume confirmation: avoid fading volume breakouts ───────────
  const avgVol = ctx.avgVol(20);
  const vol    = ctx.vol;
  const volOk  = avgVol != null && vol != null && vol >= avgVol * 0.8; // at least 80% of avg

  // ══ BUY: price at/below lower band + deeply oversold ─────────────
  if (pos === 0) {
    // Price must be at or below lower band
    const atLower = price <= lower;
    // RSI deeply oversold
    const oversold = rsi < 35;
    if (atLower && oversold && volOk) {
      const stopPx  = price * 0.98;         // 2% hard stop
      const risk    = price - stopPx;
      if (risk <= 0) return null;
      const qty = (ctx.cash * 0.02) / risk; // 2% risk per trade
      if (qty > 0) {
        ctx.log('BUY — at lower BB, RSI=' + rsi.toFixed(1) + ', lower=' + lower.toFixed(3));
        return { side: 'buy', qty: qty * 0.99 };
      }
    }
  }

  // ══ SELL: price at middle band (target) or RSI normalization ─────
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;
    const stopPx  = entryPx * 0.98;         // 2% stop
    const tpPx    = mid;                    // target = middle band

    const atTarget   = price >= tpPx;        // hit middle band
    const rsiNorm    = rsi > 58;             // overbought normalization
    const hitStop    = price <= stopPx;       // stopped out

    if (atTarget || rsiNorm || hitStop) {
      ctx.log('SELL — pnl=' + (pnlPct * 100).toFixed(1) + '% rsi=' + rsi.toFixed(1) +
        ' exit=' + (atTarget ? 'target' : rsiNorm ? 'RSI' : 'stop'));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
