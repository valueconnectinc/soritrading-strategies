/*
 * @coinsori-strategy v1
 * name: EMA-21 Trend ATR Stop 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Pure price-based trend-following: no external data dependencies.
 * Uses EMA(9) vs EMA(21) for trend, RSI > 50 for momentum, and a
 * 2× ATR trailing stop for risk management.
 * When it buys: EMA9 crosses above EMA21, price above EMA21, RSI > 50.
 * When it sells: EMA9 crosses below EMA21, or ATR trailing stop hit.
 * Does NOT work in choppy/ranging markets — multiple EMA crosses create
 * whipsaws that erode small gains. Best in clear trending periods.
 */
function onUpdate(ctx) {
  // ── Warm-up: need 21 bars for EMA21 ──────────────────────────────────────
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const ema9_1  = ctx.ema(9, 1);
  const ema21_1 = ctx.ema(21, 1);
  if (ema9 == null || ema21 == null || ema9_1 == null || ema21_1 == null) return null;

  // ── Indicators ───────────────────────────────────────────────────────────
  const rsi   = ctx.rsi(14);
  const atr   = ctx.atr(14);
  if (rsi == null || atr == null) return null;

  // ── Trend detection ───────────────────────────────────────────────────────
  const bullishCross  = ema9  > ema21;
  const prevBullish    = ema9_1 > ema21_1;
  const emaCrossUp   = !prevBullish && bullishCross;
  const emaCrossDown = prevBullish && !bullishCross;

  // ── State: trailing high + ATR stop ───────────────────────────────────────
  const s = ctx.state;
  if (ctx.position === 0) {
    s.entryPx = null;
    s.highPx  = null;
  }
  if (ctx.position > 0) {
    s.highPx = Math.max(s.highPx ?? ctx.price, ctx.price);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ENTRY — long
  //   1. Flat position
  //   2. EMA9 just crossed above EMA21
  //   3. Price above EMA21 (confirming trend)
  //   4. RSI > 50 (bullish momentum)
  // ════════════════════════════════════════════════════════════════════════════
  if (ctx.position === 0) {
    if (emaCrossUp && ctx.price >= ema21 && rsi > 50) {
      s.entryPx = ctx.price;
      s.highPx  = ctx.price;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EXIT — ATR trailing stop + EMA death cross
  //   (A) ATR trailing stop: exit if price falls > 2 × ATR below the high
  //   (B) EMA death cross: EMA9 crosses below EMA21
  // ════════════════════════════════════════════════════════════════════════════
  if (ctx.position > 0 && s.highPx != null) {
    const atrStopPx = s.highPx - 2 * atr;
    if (ctx.price < atrStopPx || emaCrossDown) {
      s.entryPx = null;
      s.highPx  = null;
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
