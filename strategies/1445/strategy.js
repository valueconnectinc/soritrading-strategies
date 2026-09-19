/*
 * @coinsori-strategy v1
 * name: Simplified EMA Momentum — SOLUSDT 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Pure EMA momentum: buys when the 5 EMA crosses above the 13 EMA on
 * above-average volume, with RSI between 35–75 (confirms momentum without
 * filtering out mid-range entries). Sells at 8% profit, RSI > 78, or a
 * 5% hard stop. No macro or funding filters — just price and volume.
 * Works in trending SOL moves. Fails in choppy markets where EMAs cross
 * repeatedly (whipsaw erosion) and in slow grinding dumps with no clear
 * cross.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Indicator warm-up ───────────────────────────────────────────────
  const ema5  = ctx.ema(5, 1);
  const ema13 = ctx.ema(13, 1);
  const rsi   = ctx.rsi(14, 1);
  if (ema5 == null || ema13 == null || rsi == null) return null;

  // ── Previous bar EMAs for crossover detection ───────────────────────
  const ema5p  = ctx.ema(5, 2);
  const ema13p = ctx.ema(13, 2);
  if (ema5p == null || ema13p == null) return null;

  const bullCross = ema5p <= ema13p && ema5 > ema13;   // 5 EMA crosses above 13

  // ── Volume confirmation ──────────────────────────────────────────────
  const avgVol = ctx.avgVol(20);
  const volOk  = avgVol == null || ctx.vol >= avgVol;

  // ── BUY ─────────────────────────────────────────────────────────────
  if (pos === 0 && bullCross && volOk) {
    // RSI confirmation: 35–75 = momentum present, not overheated
    if (rsi >= 35 && rsi <= 75) {
      ctx.log('BUY — EMA cross, RSI=' + rsi.toFixed(1) + ', vol=' + ctx.vol.toFixed(0));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ── SELL ────────────────────────────────────────────────────────────
  if (pos > 0) {
    const entryPx = ctx.entryPx;
    const pnlPct  = (price - entryPx) / entryPx;

    const profitTarget = pnlPct >= 0.08;   // +8% take-profit
    const overbought   = rsi > 78;         // RSI getting rich
    const hardStop     = pnlPct <= -0.05;  // -5% hard stop

    if (profitTarget || overbought || hardStop) {
      ctx.log('SELL — pnl=' + (pnlPct*100).toFixed(1) + '% rsi=' + rsi.toFixed(1));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
