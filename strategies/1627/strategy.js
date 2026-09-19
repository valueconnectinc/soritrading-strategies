/*
 * @coinsori-strategy v1
 * name: Stochastic Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 1000
 *
 * Trades SOLUSDT long only. Uses the Stochastic Oscillator (%K/%D crossover)
 * to catch mean-reversion pullbacks within a medium-term uptrend.
 * When %K drops into oversold (< 20) and crosses above %D, and price holds
 * above its 50 EMA, the odds favor a bounce — this strategy bets on that.
 * Works best in trending markets with regular pullbacks (not in choppy ranges).
 * Fails in sustained downtrends, low-volume chop, and when SOL moves on
 * coin-specific news that overrides technical signals.
 */

function onUpdate(ctx) {
  // ── Warm-up ───────────────────────────────────────────────────────────────
  const ema50 = ctx.ema(50);
  if (ema50 == null) return null;

  // ── Stochastic Oscillator ─────────────────────────────────────────────────
  // ctx.stoch(n=14, d=3): returns { k, d } for the current bar.
  // ago >= 1 reads closed bars only — safe for backtest and live.
  const stochCur = ctx.stoch(14, 3);
  const stoch1   = ctx.stoch(14, 3, 1); // previous bar
  const stoch2   = ctx.stoch(14, 3, 2); // bar before that
  if (!stochCur || stochCur.k == null || !stoch1 || stoch1.k == null ||
      !stoch2 || stoch2.k == null) return null;

  const k  = stochCur.k;
  const d  = stochCur.d;
  const k1 = stoch1.k;
  const d1 = stoch1.d;
  const k2 = stoch2.k;
  const d2 = stoch2.d;

  // ── Trend filter ───────────────────────────────────────────────────────────
  // Only enter when price is above the 50 EMA — confirms medium-term uptrend.
  const price     = ctx.price;
  const bullTrend = price > ema50;

  // ── Entry: Stochastic mean-reversion signal ───────────────────────────────
  // %K was below 20 two bars ago (oversold), crossed above %D one bar ago,
  // and %K is still rising — the bounce is confirmed.
  const stochCrossUp = k2 < 20 && k1 > d1 && k > k1;

  if (!ctx.position && bullTrend && stochCrossUp) {
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // ── Exit signals ───────────────────────────────────────────────────────────
  if (ctx.position) {
    // Take profit: Stochastic reaches overbought territory
    if (k > 80 && d > 70) {
      return { side: 'sell', qty: ctx.position };
    }
    // Stop loss: Stochastic collapsed deep into oversold — trend broken
    if (k < 10) {
      return { side: 'sell', qty: ctx.position };
    }
    // Trailing stop: price drops below 50 EMA after entry (trend reversal)
    if (price < ema50) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
