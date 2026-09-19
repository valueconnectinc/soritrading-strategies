/*
 * @coinsori-strategy v1
 * name: RSI Momentum Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: RSI crossing above 50 from below means buyers are taking
 * control. If this coincides with price breaking above the 20 EMA (a dynamic
 * resistance line), the move has both momentum AND structure behind it.
 * When it buys and sells: Buy when RSI crosses above 50 AND price > EMA20,
 * with volume confirming the thrust. Sell when RSI falls below 50 (momentum
 * fading) or hits overbought (>70).
 * When it does NOT work: In slow grinding uptrends where RSI stays above 50
 * for weeks without a clean cross, the strategy exits too early and misses
 * the bulk of the move.
 */
function onUpdate(ctx) {
  const state = ctx.state;

  // Track bar transitions for prev-bar comparisons
  if (state.lastBarI !== ctx.i) {
    state.prevRsi  = state.lastRsi  ?? null;
    state.prevEma  = state.lastEma  ?? null;
    state.prevPrice = state.lastPrice ?? null;
    state.lastBarI  = ctx.i;
    state.lastRsi   = ctx.rsi(14);
    state.lastEma   = ctx.ema(20);
    state.lastPrice = ctx.price;
  } else {
    state.lastRsi   = ctx.rsi(14);
    state.lastEma   = ctx.ema(20);
    state.lastPrice = ctx.price;
  }

  const rsi   = ctx.rsi(14);
  const ema20 = ctx.ema(20);
  const price = ctx.price;

  if (rsi == null || ema20 == null) return null;

  const prevRsi   = state.prevRsi;
  const prevEma   = state.prevEma;
  const prevPrice = state.prevPrice;

  // RSI crossed above 50 this bar
  const rsiCrossUp50 = prevRsi != null && prevRsi <= 50 && rsi > 50;
  // RSI crossed below 50 this bar
  const rsiCrossDown50 = prevRsi != null && prevRsi >= 50 && rsi < 50;

  // Price above EMA20 (in uptrend)
  const aboveEma = price > ema20;

  // Volume confirmation
  const vol    = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const volOk  = avgVol != null && vol != null && vol > avgVol * 0.9;

  // ATR for stop distance
  const atr = ctx.atr(14);

  // ── ENTRY ──
  if (ctx.position === 0) {
    // Buy when RSI crosses above 50 AND price is above EMA20 AND volume confirms
    if (rsiCrossUp50 && aboveEma && volOk) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  // ── EXIT ──
  if (ctx.position > 0) {
    // Exit when RSI crosses below 50 (momentum lost) OR RSI overbought
    if (rsiCrossDown50 || rsi > 70) {
      return { side: 'sell', qty: ctx.position };
    }
    // Trailing stop: 2× ATR below entry
    if (atr != null && state.entryPx != null) {
      const stopPx = state.entryPx - 2.0 * atr;
      if (price <= stopPx) {
        return { side: 'sell', qty: ctx.position };
      }
    }
  }

  // Track entry price for trailing stop
  if (ctx.position === 0 && ctx.price > 0) {
    state.entryPx = ctx.price;
  }

  return null;
}
