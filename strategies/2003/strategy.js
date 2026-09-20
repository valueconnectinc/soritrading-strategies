/*
 * @coinsori-strategy v1
 * name: ATR Regime Adaptive v4 — Volume-Confirmed
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: v2 (strategy 2000, +10.93%, MDD 4.69%) is the best in this job.
 * v3 added volume + tighter bands but got worse (-1.0/+6.7/-10.3). This v4 takes v2's
 * proven RSI bands and adds ONLY volume confirmation — no other changes.
 * When it buys and sells: Same as v2 — momentum in low-ATR regimes, mean reversion
 * in high-ATR regimes. Entries require above-average volume to confirm conviction.
 * When it does NOT work: In thin-volume trends the volume filter delays entry,
 * missing the start of moves.
 */
function onUpdate(ctx) {
  const s = ctx.state;

  if (s.lastBarI !== ctx.i) {
    s.prev = s.snap || {};
    s.lastBarI = ctx.i;
  }

  // ── Indicators ──────────────────────────────────────────
  const atr    = ctx.atr(14);
  const sma20  = ctx.sma(20);
  const ema9   = ctx.ema(9);
  const ema21  = ctx.ema(21);
  const rsi    = ctx.rsi(14);
  const bb     = ctx.bb(20, 2);
  const vol    = ctx.avgVol(20);

  if (!atr || !sma20 || !ema9 || !ema21 || !rsi || !bb || !vol) return null;

  s.snap = { ema9, ema21, rsi };

  const prev = s.prev;
  const prevEma9  = prev.ema9;
  const prevEma21 = prev.ema21;

  // ── ATR regime ─────────────────────────────────────────
  const atrPct    = (atr / ctx.price) * 100;
  const isHighVol = atrPct > 4.0;

  // ── ATR-based position sizing ───────────────────────────
  const atrRisk = Math.min(atrPct / 4.0, 1.0);
  const posFrac = 0.99 * (1.0 - atrRisk * 0.5);

  // ── Volume confirmation (v4 enhancement over v2) ──────────
  const volOk = ctx.vol > vol * 0.8;

  // ── Signal generation ───────────────────────────────────
  let buySignal  = false;
  let sellSignal = false;

  if (!isHighVol) {
    // ── Low volatility: momentum (EMA cross + RSI) ─────────
    if (prevEma9 && prevEma21) {
      const crossUp    = prevEma9 <= prevEma21 && ema9 > ema21;
      const rsiConfirm = rsi > 50 && rsi < 75;  // v2 original bands
      const aboveSma   = ctx.price > sma20;
      buySignal = crossUp && rsiConfirm && aboveSma && volOk;
    }
    if (prevEma9 && prevEma21) {
      const crossDown = prevEma9 >= prevEma21 && ema9 < ema21;
      const rsiOverb  = rsi > 75;
      sellSignal = crossDown || rsiOverb;
    }
  } else {
    // ── High volatility: mean reversion (RSI + BB) ─────────
    if (rsi < 35 && ctx.price < bb.lower) {
      buySignal = true;
    }
    if (rsi > 65 || (bb.middle && ctx.price >= bb.middle)) {
      sellSignal = true;
    }
  }

  // ── Entry / exit ────────────────────────────────────────
  if (!ctx.position) {
    if (buySignal) {
      const qty = (ctx.cash * posFrac) / ctx.price;
      return { side: 'buy', qty };
    }
  } else {
    if (sellSignal) {
      return { side: 'sell', qty: ctx.position };
    }
    // ATR-adjusted stop: 2.5× ATR below entry
    const slPx = ctx.entryPx * (1 - 2.5 * atrPct / 100);
    if (ctx.price < slPx) {
      return { side: 'sell', qty: ctx.position };
    }
    // Take-profit: RSI extreme
    const tpRsi = isHighVol ? 65 : 80;
    if (rsi > tpRsi) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
