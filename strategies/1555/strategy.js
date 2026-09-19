/*
 * @coinsori-strategy v1
 * name: RSI Oversold + MACD Histogram — LINKUSDT 4H
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Momentum-based mean reversion: buys when RSI drops below 32 (deeply
 * oversold) AND MACD histogram is still negative (downward momentum
 * still present — the bounce has not started yet). Sells when RSI > 58
 * (mean reversion complete) or MACD crosses above zero. Stop at 3.5%.
 * Works in choppy/ranging markets where oversold bounces reliably occur.
 * Fails in strong downtrends — RSI can stay below 32 for days and the
 * bounce never comes before the stop is hit.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Indicators (previous closed bar) ──────────────────────────────
  const rsi  = ctx.rsi(14, 1);
  const macd = ctx.macd(12, 26, 9, 1);
  if (rsi == null || macd == null) return null;

  const macdLine  = macd.macd;
  const signalLine = macd.signal;
  const hist      = macdLine - signalLine;

  // ── Previous bar for MACD histogram direction ────────────────────
  const macdPrev = ctx.macd(12, 26, 9, 2);
  if (macdPrev == null) return null;
  const histPrev = macdPrev.macd - macdPrev.signal;

  // Histogram is still negative: down-momentum has NOT turned yet
  // → we are catching the oversold dip before the reversal
  const histStillNeg = hist < 0;
  // Histogram turning up: momentum shifting (exit signal)
  const histTurningUp = histPrev < 0 && hist >= 0;

  // ══ BUY: RSI oversold + MACD histogram still negative ────────────
  if (pos === 0) {
    if (rsi < 32 && histStillNeg) {
      const stopPx = price * 0.965;        // 3.5% stop
      const risk   = price - stopPx;
      if (risk <= 0) return null;
      const qty = (ctx.cash * 0.02) / risk; // 2% risk per trade
      if (qty > 0) {
        ctx.log('BUY — RSI=' + rsi.toFixed(1) + ', hist=' + hist.toFixed(4));
        return { side: 'buy', qty: qty * 0.99 };
      }
    }
  }

  // ══ SELL: RSI normalized or MACD turned bullish ─────────────────
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;
    const stopPx  = entryPx * 0.965;

    const rsiNorm    = rsi > 58;             // mean reversion complete
    const macdBull   = histTurningUp || macdLine > 0; // momentum shifted
    const hitStop    = price <= stopPx;

    if (rsiNorm || macdBull || hitStop) {
      ctx.log('SELL — pnl=' + (pnlPct * 100).toFixed(1) + '% rsi=' + rsi.toFixed(1) +
        ' exit=' + (hitStop ? 'stop' : rsiNorm ? 'RSI' : 'MACD'));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
