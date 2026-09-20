/*
 * @coinsori-strategy v1
 * name: Macro Regime + ATR Dual-Framework
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Combines a top-down macro regime filter (DXY USD index) with
 * the proven ATR volatility-regime switching. DXY strength predicts crypto bear
 * regimes; weakness predicts bull regimes. The strategy reads both and switches
 * between mean-reversion and momentum signals accordingly.
 * When it buys and sells: In crypto-bull regime (DXY falling, ATR trending) → momentum
 * (EMA cross + RSI). In crypto-bear regime (DXY rising, ATR volatile) → mean reversion
 * (RSI extremes + Bollinger Bands). Position size scales inversely with ATR%.
 * When it does NOT work: Whipsaws in range-bound DXY with no clear direction;
 * the macro signal lags real-time and misses fast regime changes.
 */

function onUpdate(ctx) {
  const s = ctx.state;

  // ── Bar-change detection (run snapshot once per bar) ────
  if (s.lastBarI !== ctx.i) {
    s.prev = {
      ema9:   s.snap && s.snap.ema9,
      ema21:  s.snap && s.snap.ema21,
      rsi:    s.snap && s.snap.rsi,
      dxy:    s.snap && s.snap.dxy,
    };
    s.lastBarI = ctx.i;
  }

  // ── Indicators ──────────────────────────────────────────
  const atr     = ctx.atr(14);
  const sma20   = ctx.sma(20);
  const ema9    = ctx.ema(9);
  const ema21   = ctx.ema(21);
  const rsi     = ctx.rsi(14);
  const bb      = ctx.bb(20, 2);
  const vol     = ctx.avgVol(20);
  const dxy     = ctx.macro('dxy');

  // ── Warm-up guard ───────────────────────────────────────
  if (!atr || !sma20 || !ema9 || !ema21 || !rsi || !bb || !vol) return null;

  // Snapshot current bar values
  s.snap = { ema9, ema21, rsi, dxy };

  const prev = s.prev;
  const prevEma9  = prev && prev.ema9;
  const prevEma21 = prev && prev.ema21;
  const prevRsi   = prev && prev.rsi;
  const prevDxy   = prev && prev.dxy;

  // ── ATR% regime ─────────────────────────────────────────
  const atrPct   = (atr / ctx.price) * 100;
  const isHighVol = atrPct > 4.0;  // 4% threshold separates trending from choppy

  // ── Macro regime: DXY direction ─────────────────────────
  const dxyRising  = dxy && prevDxy && dxy > prevDxy;
  const dxyFalling = dxy && prevDxy && dxy < prevDxy;

  // ── Combined regime ──────────────────────────────────────
  // Bull: DXY falling → crypto tailwind
  // Bear: DXY rising → crypto headwind
  // Choppy: no clear DXY direction
  let regime = 'choppy';
  if (dxyFalling) {
    regime = 'bull';
  } else if (dxyRising) {
    regime = 'bear';
  }

  // ── ATR-based position sizing (risk-adjusted) ────────────
  const atrRisk = Math.min(atrPct / 4.0, 1.0);
  const posFrac = 0.99 * (1.0 - atrRisk * 0.5);  // 50–99% of capital

  // ── Signal generation by regime ─────────────────────────
  let buySignal  = false;
  let sellSignal = false;

  if (regime === 'bull') {
    // ── Momentum mode ──────────────────────────────────────
    if (prevEma9 && prevEma21) {
      const crossUp    = prevEma9 <= prevEma21 && ema9 > ema21;
      const rsiConfirm = rsi > 50 && rsi < 75;
      const aboveSma   = ctx.price > sma20;
      buySignal  = crossUp && rsiConfirm && aboveSma;
    }
    if (prevEma9 && prevEma21) {
      const crossDown = prevEma9 >= prevEma21 && ema9 < ema21;
      const rsiOverb  = rsi > 75;
      sellSignal = crossDown || rsiOverb;
    }

  } else if (regime === 'bear') {
    // ── Mean-reversion mode ────────────────────────────────
    if (rsi < 35 && ctx.price < bb.lower) {
      buySignal = true;
    }
    if (rsi > 65 || (bb.middle && ctx.price >= bb.middle)) {
      sellSignal = true;
    }

  } else {
    // ── Choppy: tight-range RSI mean reversion ─────────────
    if (rsi < 30) {
      buySignal = true;
    }
    if (rsi > 60) {
      sellSignal = true;
    }
  }

  // ── Volume confirmation (filters low-volume noise) ───────
  const volConfirm = ctx.vol > vol * 0.8;

  // ── Entry / exit ────────────────────────────────────────
  if (!ctx.position) {
    if (buySignal && volConfirm) {
      const qty = (ctx.cash * posFrac) / ctx.price;
      return { side: 'buy', qty };
    }
  } else {
    if (sellSignal) {
      return { side: 'sell', qty: ctx.position };
    }
    // ATR-adjusted stop-loss: 2.5× ATR below entry
    const slPx = ctx.entryPx * (1 - 2.5 * atrPct / 100);
    if (ctx.price < slPx) {
      return { side: 'sell', qty: ctx.position };
    }
    // Take-profit: RSI extreme
    const tpRsi = regime === 'choppy' ? 65 : 80;
    if (rsi > tpRsi) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
