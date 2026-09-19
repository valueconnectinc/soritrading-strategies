/*
 * @coinsori-strategy v1
 * name: BB+RSI Mean Reversion Fixed Stops
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when RSI(2) drops below 25 (relaxed from 20) at or below the lower
 * BB(20,2) — classic mean reversion. Sells on a fixed take-profit (12%) or
 * stop-loss (6%). No SMA trend filter (it made the signal too rare —
 * only 1 trade per 500-bar window). The core insight: tight RSI + BB lower
 * band touch catches SOL's violent mean-reversion bounces on the 4h chart.
 * When it does NOT work: in sustained trending markets where RSI stays
 * overbought/oversold for extended periods — the reversion never comes.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(2);
  const bb  = ctx.bb(20, 2);
  if (rsi == null || bb == null) return null;
  if (bb.lower == null || bb.mid == null) return null;

  const hasPosition = ctx.position > 0;
  const entryPrice  = ctx.entryPx || ctx.price;

  // ── ENTRY: RSI(2) < 25 + price at or below lower BB ─────────────────────
  const rsiOversold = rsi < 25;
  const atLowerBand = ctx.price <= bb.lower * 1.005; // within 0.5% of lower band
  const shouldBuy   = !hasPosition && rsiOversold && atLowerBand;

  if (shouldBuy) {
    ctx.log('BUY  rsi=' + rsi.toFixed(2) + ' bb.lower=' + bb.lower.toFixed(4) + ' price=' + ctx.price.toFixed(4));
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // ── EXIT: fixed TP / SL ──────────────────────────────────────────────────
  if (hasPosition) {
    const pnlPct = (ctx.price - entryPrice) / entryPrice;
    if (pnlPct >= 0.12) {
      ctx.log('SELL TP  pnl=' + (pnlPct * 100).toFixed(2) + '%');
      return { side: 'sell', qty: ctx.position };
    }
    if (pnlPct <= -0.06) {
      ctx.log('SELL SL  pnl=' + (pnlPct * 100).toFixed(2) + '%');
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
