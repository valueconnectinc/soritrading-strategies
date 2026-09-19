/*
 * @coinsori-strategy v1
 * name: RSI Oversold + Vol Filter — LINKUSDT 4H
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Simple mean reversion on RSI: buys when RSI drops below 30 (oversold)
 * AND volume is above its 20-bar average (confirming the dip is real, not
 * a low-volume wash). Sells when RSI reaches 55 (mean reversion complete)
 * or 4% stop is hit. No Bollinger Bands, no trend filter — pure and simple.
 * Works in ranging markets where oversold bounces are reliable.
 * Fails in strong downtrends — RSI can stay below 30 for days and the
 * bounce never comes before the 4% stop is hit.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Indicators (previous closed bar) ──────────────────────────────
  const rsi    = ctx.rsi(14, 1);
  const avgVol = ctx.avgVol(20);
  const vol    = ctx.vol;
  if (rsi == null) return null;

  // Volume confirmation: at least 90% of 20-bar avg (loose filter)
  const volOk = avgVol != null && vol != null && vol >= avgVol * 0.9;

  // ══ BUY: RSI oversold + volume confirming ───────────────────────
  if (pos === 0 && rsi < 30 && volOk) {
    const stopPx = price * 0.96;           // 4% stop (wider than 3.5%)
    const risk   = price - stopPx;
    if (risk <= 0) return null;
    const qty = (ctx.cash * 0.02) / risk;  // 2% risk per trade
    if (qty > 0) {
      ctx.log('BUY — RSI=' + rsi.toFixed(1) + ', vol=' + vol.toFixed(0) + ' avg=' + avgVol.toFixed(0));
      return { side: 'buy', qty: qty * 0.99 };
    }
  }

  // ══ SELL: RSI normalization or stop hit ──────────────────────────
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;
    const stopPx  = entryPx * 0.96;

    const rsiNorm = rsi > 55;              // mean reversion complete
    const hitStop = price <= stopPx;

    if (rsiNorm || hitStop) {
      ctx.log('SELL — pnl=' + (pnlPct * 100).toFixed(1) + '% rsi=' + rsi.toFixed(1) +
        ' exit=' + (hitStop ? 'stop' : 'RSI'));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
