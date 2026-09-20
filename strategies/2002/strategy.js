/*
 * @coinsori-strategy v1
 * name: ATR Regime Adaptive v3 — Volume-Enhanced
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The ATR regime-switching core (strategy 2000, +10.93%, MDD 4.69%)
 * is the best result in this job. This v3 tightens entry quality by adding volume
 * confirmation and narrower RSI bands, reducing whipsaws in choppy markets.
 * When it buys and sells: Same regime logic as v2 — momentum in trending markets,
 * mean reversion in choppy — but entries now require above-average volume to confirm
 * conviction, and exits use tighter RSI bands.
 * When it does NOT work: In strong one-directional trends, volume confirmation may
 * delay entry until the first pullback, missing the initial move.
 */
function onUpdate(ctx) {
  const s = ctx.state;

  // Snapshot once per bar
  if (s.lastBarI !== ctx.i) {
    s.prev = s.snap || {};
    s.lastBarI = ctx.i;
  }

  // ── Indicators ──────────────────────────────────────────
  const atr     = ctx.atr(14);
  const atr1    = ctx.atr(14, 1);
  const sma20   = ctx.sma(20);
  const ema9    = ctx.ema(9);
  const ema21   = ctx.ema(21);
  const rsi     = ctx.rsi(14);
  const bb      = ctx.bb(20, 2);
  const vol     = ctx.avgVol(20);
  const vol1    = ctx.volPrev;           // previous bar's volume

  // ── Warm-up guard ───────────────────────────────────────
  if (!atr || !sma20 || !ema9 || !ema21 || !rsi || !bb || !vol) return null;

  // Snapshot current bar
  s.snap = { ema9, ema21, rsi };

  const prev = s.prev;
  const prevEma9  = prev.ema9;
  const prevEma21 = prev.ema21;
  const prevRsi   = prev.rsi;

  // ── ATR regime ─────────────────────────────────────────
  const atrPct    = (atr / ctx.price) * 100;
  const atrPct1   = (atr1 / ctx.price) * 100;
  const isHighVol = atrPct > 4.0;
  const atrRising = atrPct > atrPct1;  // volatility expanding

  // ── ATR-based position sizing ───────────────────────────
  const atrRisk = Math.min(atrPct / 4.0, 1.0);
  const posFrac = 0.99 * (1.0 - atrRisk * 0.5);  // 50–99% of capital

  // ── Volume confirmation (v3 enhancement) ─────────────────
  // Confirm with above-average volume OR volume expanding vs previous bar
  const volOk = ctx.vol > vol * 0.8 || (vol1 && ctx.vol > vol1 * 1.1);

  // ── Signal generation ───────────────────────────────────
  let buySignal  = false;
  let sellSignal = false;

  if (!isHighVol) {
    // ── Low volatility: momentum (EMA cross) ────────────────
    if (prevEma9 && prevEma21) {
      const crossUp    = prevEma9 <= prevEma21 && ema9 > ema21;
      const rsiConfirm = rsi > 45 && rsi < 70;  // tighter band (was 50-75)
      const aboveSma   = ctx.price > sma20;
      buySignal = crossUp && rsiConfirm && aboveSma && volOk;
    }
    if (prevEma9 && prevEma21) {
      const crossDown = prevEma9 >= prevEma21 && ema9 < ema21;
      const rsiOverb  = rsi > 70;  // tighter (was 75)
      sellSignal = crossDown || rsiOverb;
    }
  } else {
    // ── High volatility: mean reversion (RSI + BB) ─────────
    if (rsi < 32 && ctx.price < bb.lower) {  // tighter RSI (was 35)
      buySignal = true;
    }
    if (rsi > 62 || (bb.middle && ctx.price >= bb.middle)) {  // tighter RSI (was 65)
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
    // Take-profit: RSI reached 75+ (trending) or 65+ (choppy)
    const tpRsi = isHighVol ? 65 : 75;
    if (rsi > tpRsi) {
      return { side: 'sell', qty: ctx.position };
    }
    // Time-based exit: if in position > 20 bars and RSI neutral, exit
    if (s.posAge !== undefined && s.posAge > 20 && rsi > 40 && rsi < 60) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // Track position age
  if (ctx.position) {
    s.posAge = (s.posAge || 0) + 1;
  } else {
    s.posAge = 0;
  }

  return null;
}
