/*
 * @coinsori-strategy v1
 * name: ATR Regime Adaptive v2 — SOLUSDT 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: v1 beat the benchmark in crash/chop windows but badly
 * lagged in bull runs because ATR only measures VOLATILITY, not DIRECTION.
 * This v2 adds a 50-EMA trend filter so the regime logic knows WHICH way
 * to lean. The strategy now has three axes:
 *   1. ATR regime  → how wild is the market (chop vs trending)
 *   2. EMA50 dir   → what is the primary direction
 *   3. Entry signal → momentum or mean reversion within that context
 * ATR also sizes positions inversely to volatility for consistent risk.
 * When it buys and sells: Long in uptrend (EMA50 rising) when RSI dips to
 * 35 in chop or EMA9 crosses above EMA21 in trends. Opposite for shorts.
 * When it does NOT work: In range-bound markets where EMA50 is flat, the
 * trend filter gives no signal and the strategy sits out — potentially
 * missing mean-reversion opportunities. Also fails when EMA50 direction
 * flips frequently (whipsaw-heavy regimes).
 */

function onUpdate(ctx) {
  const atr    = ctx.atr(14);
  if (atr == null) return null;
  const atrPct = atr / ctx.price * 100;
  const emaAtr = ctx.ema(20);
  if (emaAtr == null) return null;

  // --- Volatility regime (wider mid-zone to reduce noise) ---
  const isHighVol = atrPct > emaAtr * 1.2;
  const isLowVol  = atrPct < emaAtr * 0.8;

  // --- Trend direction: EMA50 slope over 5 bars (~20h) ---
  const ema50Now  = ctx.ema(50, 0);
  const ema50Prev = ctx.ema(50, 5);
  if (ema50Now == null || ema50Prev == null) return null;
  const ema50Rising = ema50Now > ema50Prev;
  const ema50Falling = ema50Now < ema50Prev;

  // --- Core indicators ---
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);
  const bb    = ctx.bb(20, 2);
  const vol   = ctx.avgVol(20);
  if (ema9 == null || ema21 == null || rsi == null || bb == null || vol == null) return null;

  const hasPos   = ctx.position > 0;
  const hasShort = ctx.position < 0;

  // --- ATR-based risk sizing: 1.5% risk, 2× ATR stop ---
  const riskCash = ctx.cash * 0.015;
  const stopDist = atr * 2.0;
  const qty      = riskCash / stopDist;

  // --- Volume confirmation: current vol above 20-bar average ---
  const volConfirm = ctx.vol > vol;

  // ======== ENTRY LOGIC ========

  // ---- TREND REGIME (high volatility) ----
  if (isHighVol) {
    // Check EMA cross
    const ema9Now  = ctx.ema(9,  0);
    const ema21Now = ctx.ema(21, 0);
    const ema9Prev = ctx.ema(9,  1);
    const ema21Prev= ctx.ema(21, 1);
    if (ema9Now == null || ema21Now == null || ema9Prev == null || ema21Prev == null) return null;

    const crossUp   = ema9Prev <= ema21Prev && ema9Now  > ema21Now;
    const crossDown = ema9Prev >= ema21Prev && ema9Now  < ema21Now;

    // Long: EMA cross up + EMA50 confirming direction + RSI not overheated
    if (!hasPos && crossUp && ema50Rising && rsi < 75 && rsi > 40) {
      return { side: 'buy', qty: qty, type: 'limit', price: ctx.price * 0.998 };
    }
    // Close long: EMA cross down OR RSI drops too far
    if (hasPos && (crossDown || rsi < 38)) {
      return { side: 'sell', qty: ctx.position };
    }
    // Short: EMA cross down + EMA50 confirming direction + RSI not oversold
    if (!hasShort && crossDown && ema50Falling && rsi > 25 && rsi < 60) {
      return { side: 'sell', qty: qty, type: 'limit', price: ctx.price * 1.002 };
    }
    // Close short: EMA cross up OR RSI rises too far
    if (hasShort && (crossUp || rsi > 62)) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
  }
  // ---- CHOP REGIME (low volatility) ----
  else if (isLowVol) {
    // Mean reversion: buy deep RSI oversold, sell overbought
    // Only in the direction confirmed by EMA50 trend
    if (!hasPos && rsi < 28 && ctx.price <= bb.lower * 1.02) {
      // In strong uptrend, allow mean-reversion long even in chop
      if (ema50Rising || rsi < 22) {
        return { side: 'buy', qty: qty, type: 'limit', price: ctx.price * 0.998 };
      }
    }
    // Close long on mean-reversion target
    if (hasPos && rsi > 68) {
      return { side: 'sell', qty: ctx.position };
    }
    // Short: RSI overbought + price near upper band
    if (!hasShort && rsi > 72 && ctx.price >= bb.upper * 0.98) {
      // Only if EMA50 is falling or RSI extreme
      if (ema50Falling || rsi > 78) {
        return { side: 'sell', qty: qty, type: 'limit', price: ctx.price * 1.002 };
      }
    }
    // Close short on mean-reversion target
    if (hasShort && rsi < 38) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
  }
  // ---- MID VOLATILITY: trend-follow only (no mean reversion) ----
  else {
    // Only enter if trend is clearly aligned
    if (!hasPos && ema50Rising && ema9 > ema21 && rsi > 48 && rsi < 70 && volConfirm) {
      return { side: 'buy', qty: qty, type: 'limit', price: ctx.price * 0.998 };
    }
    if (hasPos && (ema50Falling || rsi < 42)) {
      return { side: 'sell', qty: ctx.position };
    }
    if (!hasShort && ema50Falling && ema9 < ema21 && rsi < 52 && rsi > 30 && volConfirm) {
      return { side: 'sell', qty: qty, type: 'limit', price: ctx.price * 1.002 };
    }
    if (hasShort && (ema50Rising || rsi > 58)) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
  }

  return null;
}
