/*
 * @coinsori-strategy v1
 * name: Volume Spike Pullback — LINKUSDT 4H
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 10000
 *
 * Volume spike pullback reversal: when volume surges 2× above its 20-bar
 * average, it often marks capitulation or absorption — a reversal point.
 * Buys when price is within 1.5% of the recent low (not breaking new lows)
 * AND volume is 2×+ average (capitulation confirmed). Sells when RSI > 62
 * or price reaches the middle Bollinger Band or 5% profit / 4% stop.
 * Works in volatile markets with sharp capitulation candles.
 * Fails in slow grinding trends where volume never spikes — no entry triggers.
 */
function onUpdate(ctx) {
  const pos   = ctx.position;
  const price = ctx.price;

  // ── Price indicators ───────────────────────────────────────────────
  const rsi = ctx.rsi(14, 1);
  const bb  = ctx.bb(20, 2, 1);
  if (rsi == null || bb == null) return null;

  // ── Volume confirmation ─────────────────────────────────────────────
  const avgVol = ctx.avgVol(20);
  if (avgVol == null) return null;
  const volRatio = ctx.vol / avgVol;   // current vol / 20-bar avg

  // ── Recent low (5 bars back) — entry price reference ───────────────
  // ago=1 through ago=5 reads closed bars; only use if available
  let recentLow = price;
  for (let ago = 1; ago <= 5; ago++) {
    const lp = ctx.low(1, ago);   // low price ago bars back
    if (lp != null && lp < recentLow) recentLow = lp;
  }

  // ── EMA trend (avoid counter-trend entries) ─────────────────────────
  const ema20 = ctx.ema(20, 1);
  if (ema20 == null) return null;
  const aboveEma = price > ema20;

  // ══ ENTRY: volume spike + price near recent low + not below EMA ══
  if (pos === 0) {
    const volSpike     = volRatio >= 2.0;   // vol 2× above average
    const nearLow      = price <= recentLow * 1.015;  // within 1.5% of low
    const notNewLow    = price > recentLow;             // NOT breaking new low
    const trendConfirm = aboveEma;                      // not fighting EMA down

    if (volSpike && nearLow && notNewLow && trendConfirm) {
      ctx.log('BUY — volRatio=' + volRatio.toFixed(1) + 'x nearLow=' + recentLow.toFixed(3));
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
  }

  // ══ EXIT ══════════════════════════════════════════════════════════
  if (pos > 0) {
    const entryPx  = ctx.entryPx;
    const pnlPct   = (price - entryPx) / entryPx;
    const midBand  = bb.mid;

    const rsiRich    = rsi > 62;
    const atMidBand  = price >= midBand;
    const profitTgt  = pnlPct >= 0.05;
    const hardStop   = pnlPct <= -0.04;

    if (rsiRich || atMidBand || profitTgt || hardStop) {
      ctx.log('SELL — pnl=' + (pnlPct*100).toFixed(1) + '% rsi=' + rsi.toFixed(1));
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
