/*
 * @coinsori-strategy v1
 * name: EMA 21/50 + SMA Trend Filter + Vol — LINKUSDT 4H
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Trend-following EMA crossover on a longer timeframe: buys when the
 * 21 EMA crosses above the 50 EMA with price above SMA 200 (primary uptrend
 * confirmed) and above-average volume (institutional participation). RSI
 * must be in 45–65 zone. Sells on reverse cross or RSI > 75.
 * Works in sustained trends. Fails in choppy/ranging markets where even
 * longer EMAs cross repeatedly — each whipsaw costs a full round-trip.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Indicators (previous closed bar) ──────────────────────────────
  const ema21 = ctx.ema(21, 1);
  const ema50 = ctx.ema(50, 1);
  const sma200 = ctx.sma(200, 1);
  const rsi   = ctx.rsi(14, 1);
  const atr   = ctx.atr(14, 1);
  if (ema21 == null || ema50 == null || sma200 == null || rsi == null || atr == null) return null;

  // ── Volume confirmation: current bar vol vs 20-bar average ────────
  const avgVol = ctx.avgVol(20);
  const vol    = ctx.vol;
  const volConfirm = avgVol != null && vol != null && vol > avgVol * 1.1; // 10% above avg

  // ── Previous bar EMAs for crossover detection ─────────────────────
  const ema21p = ctx.ema(21, 2);
  const ema50p = ctx.ema(50, 2);
  if (ema21p == null || ema50p == null) return null;

  const bullCross = ema21p <= ema50p && ema21 > ema50;   // 21 crosses above 50
  const bearCross = ema21p >= ema50p && ema21 < ema50;   // 21 crosses below 50

  // ── Trend: price must be above SMA 200 (no counter-trend trades) ──
  const bullTrend = price > sma200;

  // ══ BUY ───────────────────────────────────────────────────────────
  if (pos === 0 && bullCross && bullTrend) {
    // RSI 45–65 = building momentum, not overheated
    if (rsi >= 45 && rsi <= 65) {
      // Volume confirmation — skip if volume not above average
      if (!volConfirm) return null;

      const stopPx = price - 1.5 * atr;
      const risk   = price - stopPx;
      if (risk <= 0) return null;
      const qty = (ctx.cash * 0.02) / risk;   // 2% risk per trade
      if (qty > 0) {
        ctx.log('BUY — EMA 21/50 cross UP, RSI=' + rsi.toFixed(1) + ', vol=' + (volConfirm ? 'OK' : 'low'));
        return { side: 'buy', qty: qty * 0.99 };
      }
    }
  }

  // ══ SELL ─────────────────────────────────────────────────────────
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;
    const stopPx  = entryPx - 1.5 * atr;
    const tpPx    = entryPx + 2.5 * atr;

    const emaExit   = bearCross;
    const rsiRich   = rsi > 75;
    const hitStop   = price <= stopPx;
    const hitTarget = price >= tpPx;

    if (emaExit || rsiRich || hitStop || hitTarget) {
      ctx.log('SELL — pnl=' + (pnlPct * 100).toFixed(1) + '% rsi=' + rsi.toFixed(1));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
