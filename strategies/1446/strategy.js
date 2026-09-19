/*
 * @coinsori-strategy v1
 * name: EMA 20/50 Trend + DXY Macro Filter — SOLUSDT 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Trend-following on SOLUSDT 4H: buys when EMA 20 crosses above EMA 50
 * (golden cross) on above-average volume, with RSI in a healthy 40–70 range
 * (avoids both oversold entries and overheated entries). An additional
 * macro filter stays neutral when DXY > 104 — strong USD regimes historically
 * suppress risk assets including SOL. Takes profit at 25% or exits on the
 * death cross or a -10% stop.
 * Works in sustained SOL uptrends. Fails in slow grinding chop where EMAs
 * tangle, and in strong USD rallies where the DXY filter exits too early.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Indicator warm-up ───────────────────────────────────────────────
  const ema20  = ctx.ema(20, 1);
  const ema50  = ctx.ema(50, 1);
  const rsi    = ctx.rsi(14, 1);
  if (ema20 == null || ema50 == null || rsi == null) return null;

  // ── Previous bar EMAs for crossover detection ───────────────────────
  const ema20p = ctx.ema(20, 2);
  const ema50p = ctx.ema(50, 2);
  if (ema20p == null || ema50p == null) return null;

  const bullCross = ema20p <= ema50p && ema20 > ema50;   // golden cross
  const bearCross = ema20p >= ema50p && ema20 < ema50;   // death cross

  // ── Volume confirmation ──────────────────────────────────────────────
  const avgVol = ctx.avgVol(20);
  const volOk  = avgVol == null || ctx.vol >= avgVol;

  // ── Macro regime: DXY > 104 → USD strong, stay neutral ───────────────
  // ctx.macro() returns an object; access .value for the numeric price
  const dxyRaw  = ctx.macro('dxy');
  const dxy      = (dxyRaw != null && typeof dxyRaw.value === 'number') ? dxyRaw.value : null;
  const usdStrong = dxy != null && dxy > 104;

  // ── BUY ─────────────────────────────────────────────────────────────
  if (pos === 0 && bullCross && volOk && !usdStrong) {
    // RSI 40–70: healthy momentum, not overheated, not oversold
    if (rsi >= 40 && rsi <= 70) {
      ctx.log('BUY — golden cross, RSI=' + rsi.toFixed(1) + ', DXY=' + (dxy != null ? dxy.toFixed(2) : 'n/a'));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── SELL ────────────────────────────────────────────────────────────
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;

    const profitTarget = pnlPct >= 0.25;  // 25% — wide enough for SOL 4H trends
    const exitSignal   = bearCross;        // death cross exit
    const hardStop     = pnlPct <= -0.10; // -10% hard stop

    if (profitTarget || exitSignal || hardStop) {
      const reason = profitTarget ? 'profit' : (exitSignal ? 'death cross' : 'stop');
      ctx.log('SELL — ' + reason + ', pnl=' + (pnlPct * 100).toFixed(1) + '%');
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
