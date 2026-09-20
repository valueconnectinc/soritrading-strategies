/*
 * @coinsori-strategy v1
 * name: EMA Crossover + Tight ATR Stop
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL trends sharply but choppy in between. EMA crossover
 * catches the big moves; a tight ATR stop (1.5x vs prior 2.5x) prevents
 * winners from shrinking back to zero. Volume filter cuts false breakouts.
 * When it buys and sells: Buy when EMA9 crosses above EMA21 on a closed bar,
 * with RSI>50 (momentum confirmed) and volume>1.5x avg (institutional push).
 * Sell on reverse crossover or when price hits 1.5x ATR stop below entry.
 * When it does NOT work: In tight ranges where EMAs criss-cross repeatedly,
 * each false cross costs a trade. Also struggles at the start of trends
 * (lagging signal) and end of trends ( ATR stop exits too early).
 */

function onUpdate(ctx) {
  // Need 21 bars for EMA21 warmup + ATR(14)
  if (ctx.i < 21) return null;

  // ── Indicators ──────────────────────────────────────────────
  const atr9  = ctx.atr(9);   // ATR for stop (shorter period = tighter)
  const atr14 = ctx.atr(14);  // ATR for signal filter
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);
  const av20  = ctx.avgVol(20);  // 20-bar avg volume for filter

  if (atr9 == null || atr14 == null || ema9 == null || ema21 == null ||
      rsi == null || av20 == null || av20 === 0) return null;

  // ── Previous bar data (ago=1 = last closed bar, stable) ──────
  const ema9_p1  = ctx.ema(9,  1);
  const ema21_p1 = ctx.ema(21, 1);
  if (ema9_p1 == null || ema21_p1 == null) return null;

  // ── EMA crossover on CLOSED bars (no repainting) ─────────────
  // Cross UP: EMA9 was below EMA21 1 bar ago, now above
  const crossUp   = ema21_p1 >= ema9_p1 && ema9 > ema21;
  // Cross DOWN: EMA9 was above EMA21 1 bar ago, now below
  const crossDown = ema9_p1 >= ema21_p1 && ema21 > ema9;

  // ── Filters ─────────────────────────────────────────────────
  const rsiConfirm = rsi > 50;          // Confirm upward momentum
  const rsiWeak   = rsi < 50;          // Confirm downward momentum
  const volConfirm = ctx.vol > av20 * 1.5;  // Volume spike (1.5x avg)
  const bullBias  = ctx.price > ctx.ema(20); // Price above EMA20 = uptrend
  const bearBias  = ctx.price < ctx.ema(20); // Price below EMA20 = downtrend

  // ── Entry signals ────────────────────────────────────────────
  const buySignal  = crossUp  && rsiConfirm && volConfirm && bullBias;
  const sellSignal = crossDown && rsiWeak   && volConfirm && bearBias;

  // ── Position sizing: 1% risk per trade, 1.5x ATR stop ───────
  const stopDist = 1.5 * atr9;  // Tight stop: 1.5x ATR (vs prior 2.5x)
  if (stopDist <= 0) return null;

  // ── Open position: look for entries ─────────────────────────
  if (ctx.position === 0) {
    if (buySignal) {
      const riskAmt = ctx.cash * 0.01;
      const qty    = riskAmt / stopDist / ctx.price;
      return { side: 'buy', qty };
    }
    if (sellSignal) {
      const riskAmt = ctx.cash * 0.01;
      const qty    = riskAmt / stopDist / ctx.price;
      return { side: 'sell', qty };
    }
  }

  // ── Close on reverse signal or ATR stop ─────────────────────
  if (ctx.position > 0) {
    // Tight ATR stop: exit if price dropped stopDist from entry
    if (ctx.price <= ctx.entryPx - stopDist) {
      return { side: 'sell', qty: ctx.position };
    }
    // Also exit on bearish EMA cross (trend reversing)
    if (crossDown) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  if (ctx.position < 0) {
    if (ctx.price >= ctx.entryPx + stopDist) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
    if (crossUp) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
  }

  return null;
}
