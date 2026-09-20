/*
 * @coinsori-strategy v1
 * name: ATR Trailing Stop Trend Follower
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: BTCUSDT trends strongly but whipsaws in chop.
 * Fixed-percentage stops get hit by normal volatility; ATR-based stops adapt to
 * actual market noise. This strategy rides trends with a trailing ATR stop that
 * locks in gains while letting winners run — and skips entries when momentum is weak.
 * When it buys and sells: Buy when EMA9 crosses above EMA21 AND RSI(14) > 50
 * (momentum confirmed). Sell when trailing ATR stop triggers or profit target hit.
 * When it does NOT work: In choppy, directionless markets the EMA cross fires
 * repeatedly with small moves — ATR stop gets hit often, eroding small gains.
 */

function onUpdate(ctx) {
  // ── Indicators ──────────────────────────────────────────────────────────────
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);
  const atr   = ctx.atr(14);

  if (ema9 == null || ema21 == null || rsi == null || atr == null) return null;

  // ── EMA crossover on previous closed bar (stable, no repainting) ───────────
  const ema9_1  = ctx.ema(9,  1);
  const ema21_1 = ctx.ema(21, 1);
  if (ema9_1 == null || ema21_1 == null) return null;

  const bullishCross = ema9 > ema21 && ema9_1 <= ema21_1;
  const bearishCross = ema9 < ema21 && ema9_1 >= ema21_1;

  // ── State ───────────────────────────────────────────────────────────────────
  const pos    = ctx.position;
  const px     = ctx.price;
  const entryPx = ctx.entryPx;

  // ── Entry: Long ─────────────────────────────────────────────────────────────
  if (pos === 0) {
    // Buy on golden cross + momentum confirmation
    if (bullishCross && rsi > 50) {
      const qty = ctx.cash / px * 0.98;
      return { side: 'buy', qty, type: 'limit', price: px };
    }
    return null;
  }

  // ── Active position management ───────────────────────────────────────────────
  if (pos > 0 && entryPx != null) {
    // ATR stop distance as percentage of entry (adapts to BTC price level)
    const atrPct = atr / entryPx;

    // Trailing stop: track highest price, stop = highest - N×ATR%
    // ctx.state is a shared mutable object — use it to persist highWater
    if (ctx.state.highWater == null) ctx.state.highWater = entryPx;
    ctx.state.highWater = Math.max(ctx.state.highWater, px);

    // Stop level: 2.5× ATR below high water
    const stopPx = ctx.state.highWater * (1 - 2.5 * atrPct);

    // Profit target: entry + 2× ATR (lock gains if move is big enough)
    const targetPx = entryPx + 2.0 * atr;

    // Sell if stop triggered (price dropped below stop level)
    if (px < stopPx) {
      ctx.state.highWater = null; // reset for next trade
      return { side: 'sell', qty: pos };
    }

    // Sell if profit target hit
    if (px >= targetPx) {
      ctx.state.highWater = null;
      return { side: 'sell', qty: pos };
    }

    // Exit on bearish EMA cross (trend reversing)
    if (bearishCross) {
      ctx.state.highWater = null;
      return { side: 'sell', qty: pos };
    }
  }

  return null;
}
