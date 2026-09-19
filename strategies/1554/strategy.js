/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Rev + 50SMA Filter — LINKUSDT 4H
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean reversion on Bollinger Bands with a trend filter: buys when price
 * touches the lower band (2 SD below 20-period SMA) with RSI < 35 AND
 * price above the 50-period SMA (short-term trend up — no counter-trend
 * trades). Sells at middle band or RSI > 60. Stop at 3.5% below entry.
 * Works in ranging/choppy markets. Fails in strong trends — price can
 * stay at the lower band for weeks and a "bounce" never comes.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Indicators (previous closed bar) ──────────────────────────────
  const bb    = ctx.bb(20, 2, 1);
  const sma50 = ctx.sma(50, 1);
  const rsi   = ctx.rsi(14, 1);
  if (bb == null || sma50 == null || rsi == null) return null;
  const lower = bb.lower;
  const mid   = bb.mid;

  // ── Trend filter: only buy when price above 50 SMA ───────────────
  // Avoids fighting short-term downtrends; less restrictive than SMA 200
  const aboveTrend = price > sma50;

  // ══ BUY: at lower band + oversold + above SMA 50 ────────────────
  if (pos === 0 && aboveTrend) {
    const atLower  = price <= lower;
    const oversold = rsi < 35;
    if (atLower && oversold) {
      const stopPx = price * 0.965;       // 3.5% stop (wider than 2%)
      const risk   = price - stopPx;
      if (risk <= 0) return null;
      const qty = (ctx.cash * 0.02) / risk;
      if (qty > 0) {
        ctx.log('BUY — lower BB, RSI=' + rsi.toFixed(1) + ', sma50=' + sma50.toFixed(3));
        return { side: 'buy', qty: qty * 0.99 };
      }
    }
  }

  // ══ SELL: at middle band target or RSI normalization ─────────────
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;
    const stopPx  = entryPx * 0.965;      // 3.5% stop
    const tpPx    = mid;                  // target = middle band

    const atTarget = price >= tpPx;
    const rsiNorm  = rsi > 60;            // slightly wider than 58
    const hitStop  = price <= stopPx;

    if (atTarget || rsiNorm || hitStop) {
      ctx.log('SELL — pnl=' + (pnlPct * 100).toFixed(1) + '% rsi=' + rsi.toFixed(1) +
        ' exit=' + (atTarget ? 'target' : rsiNorm ? 'RSI' : 'stop'));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
