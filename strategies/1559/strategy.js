/*
 * @coinsori-strategy v1
 * name: EMA Crossover + Volume Confirmation
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: EMA(8) crossing above EMA(21) is a clean trend-following
 * signal. Adding a volume surge filter (volume > 1.5× its 20-bar average) removes
 * weak crossovers that lack market conviction. This is simpler than MACD and
 * less prone to overfitting.
 * When it buys and sells: Buys when EMA(8) crosses above EMA(21) AND volume
 * surges above 1.5× its 20-bar average. Sells on the reverse crossover.
 * When it does NOT work: In volatile altcoin markets where volume spikes
 * frequently without directional follow-through; or in strongly trending
 * markets where the fast EMA never crosses back (misses the full move).
 */
function onUpdate(ctx) {
  // ── Warm-up ────────────────────────────────────────────────────────────────
  const ema8  = ctx.ema(8);
  const ema21 = ctx.ema(21);
  if (ema8 == null || ema21 == null) return null;

  // ── Previous bar EMAs (for crossover detection) ───────────────────────────
  const e8p = ctx.ema(8,  1);
  const e21p = ctx.ema(21, 1);
  if (e8p == null || e21p == null) return null;

  // ── Volume confirmation ───────────────────────────────────────────────────
  const volSMA = ctx.avgVol(20);
  if (volSMA == null) return null;
  const volSurge = ctx.vol > volSMA * 1.5;

  // ── Bullish EMA crossover + volume confirmation ─────────────────────────────
  const bullCross = e8p <= e21p && ema8 > ema21;

  if (bullCross && volSurge && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // ── Bearish EMA crossover: exit ───────────────────────────────────────────
  const bearCross = e8p >= e21p && ema8 < ema21;

  if (bearCross && ctx.position > 0) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
