/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + RSI Oversold
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL cycles sharply — oversold bounces are reliable.
 * BB marks extremes; RSI confirms true oversold (not just price noise).
 * Mean reversion on SOL 4H showed +30-38% in strong windows (exp 397).
 * When it buys and sells: Buy when price closes below lower BB band AND
 * RSI < 35 (deeply oversold). Sell at middle BB band (mean reversion target).
 * Stop at 1.5x ATR below entry. Trend filter (EMA20 rising) avoids catching knives.
 * When it does NOT work: In strong sustained trends, price stays at lower band
 * and never reverts — the stop gets hit repeatedly. Also fails if RSI is
 * chronically low (no mean reversion in a genuine downtrend).
 */

function onUpdate(ctx) {
  // Need 21 bars for BB(20) + RSI(14) warmup
  if (ctx.i < 21) return null;

  // ── Indicators ──────────────────────────────────────────────
  const bb    = ctx.bb(20, 2);   // BB(20,2): { lower, mid, upper }
  const rsi   = ctx.rsi(14);
  const atr14 = ctx.atr(14);
  const ema20 = ctx.ema(20);
  const ema20_p1 = ctx.ema(20, 1);  // Previous bar for trend check

  if (!bb || bb.lower == null || rsi == null || atr14 == null ||
      ema20 == null || ema20_p1 == null) return null;

  const { lower, mid, upper } = bb;
  const price = ctx.price;

  // ── Trend filter: EMA20 must be rising (price above prior EMA20) ──
  // This avoids "catching falling knives" in genuine downtrends
  const bullTrend = ema20 > ema20_p1;

  // ── Entry: price below lower BB AND deeply oversold ───────────
  const oversold   = rsi < 35;           // Deep oversold, not just <50
  const atLowerBB  = price < lower;      // Price touching/breaking lower band
  const buySignal  = oversold && atLowerBB && bullTrend;

  // ── Position sizing: 2% risk, 1.5x ATR stop ──────────────────
  const stopDist = 1.5 * atr14;
  if (stopDist <= 0) return null;

  // ── Open position ────────────────────────────────────────────
  if (ctx.position === 0) {
    if (buySignal) {
      const riskAmt = ctx.cash * 0.02;   // 2% risk per trade (higher than prior 1%)
      const qty     = riskAmt / stopDist / price;
      return { side: 'buy', qty };
    }
  }

  // ── Exit logic ───────────────────────────────────────────────
  if (ctx.position > 0) {
    // Take profit at middle BB band (mean reversion target)
    if (price >= mid) {
      return { side: 'sell', qty: ctx.position };
    }
    // Hard stop: 1.5x ATR below entry
    if (price <= ctx.entryPx - stopDist) {
      return { side: 'sell', qty: ctx.position };
    }
    // Time stop: if held > 20 bars without hitting mid band, exit at EMA20
    // (use i tracking via state — ctx has no bar-count-in-position, so use a simple rule)
    // Exit if price drops below EMA20 (trend broke)
    if (price < ema20) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
