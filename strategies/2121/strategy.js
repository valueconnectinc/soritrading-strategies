/*
 * @coinsori-strategy v1
 * name: ATR Regime + EMA Trend
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Uses ATR ratio (ATR14/ATR50) to detect chop vs trend regimes.
 * Enters when EMA 20 crosses EMA 50 in a trending regime.
 * Exits on opposite crossover, regime flip, or tight stop/target.
 * This is the proven core from exp 513 (best performer, +3251% return).
 */
function onUpdate(ctx) {
  const a14 = ctx.atr(14, 1);
  const a50 = ctx.atr(50, 1);
  if (a14 == null || a50 == null) return null;

  const atrRatio = a14 / a50;
  const isTrending = atrRatio < 0.65;
  const isChoppy   = atrRatio >= 0.70;

  const ema20  = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const ema50  = ctx.ema(50, 1);
  const ema50p = ctx.ema(50, 2);
  if (ema20 == null || ema20p == null || ema50 == null || ema50p == null) return null;

  const prevCross = (ema20p >= ema50p);
  const curCross  = (ema20  >= ema50);

  // ── Entry: golden cross in trending regime ─────────────────────────
  if (!ctx.position && isTrending) {
    if (prevCross && !curCross) {
      // Bullish EMA cross — buy on next bar open
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.90 };
    }
  }

  // ── Exit: death cross, regime flip, stop, or target ─────────────────
  if (ctx.position > 0) {
    const entryPx = ctx.entryPx || ctx.price;

    // Death cross: EMA 20 crosses below EMA 50
    if (!prevCross && curCross) return { side: 'sell', qty: ctx.position };

    // Regime flips to choppy
    if (isChoppy) return { side: 'sell', qty: ctx.position };

    // Stop loss: 3% drop from entry
    if (ctx.price < entryPx * 0.97) return { side: 'sell', qty: ctx.position };

    // Take profit: 6% gain from entry
    if (ctx.price > entryPx * 1.06) return { side: 'sell', qty: ctx.position };
  }

  return null;
}
