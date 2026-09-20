/*
 * @coinsori-strategy v1
 * name: ATR Regime + Volume Momentum
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Uses ATR ratio (ATR14/ATR50) to detect chop vs trend regimes.
 * Only enters during trending regimes. Entries confirmed by volume surge
 * and EMA slope alignment. Exits on regime flip or trend reversal.
 * Funding rate filters out extreme sentiment peaks.
 */

function onUpdate(ctx) {
  // ── Regime detection ──────────────────────────────────────────────
  const a14 = ctx.atr(14, 1);
  const a50 = ctx.atr(50, 1);
  if (a14 == null || a50 == null) return null;
  const atrRatio = a14 / a50;

  const isTrending = atrRatio < 0.65;  // trending below 0.65
  const isChoppy   = atrRatio >= 0.70; // skip entries in deep chop

  // ── Trend direction (EMA slope) ──────────────────────────────────
  const ema20  = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  if (ema20 == null || ema20p == null) return null;

  const emaSlope = ema20 - ema20p; // positive = uptrend
  const bullish  = emaSlope > 0;
  const bearish  = emaSlope < 0;

  // ── Volume confirmation ─────────────────────────────────────────
  const avgV   = ctx.avgVol(20);      // 20-bar avg volume (1 arg only)
  const prevV  = ctx.volPrev;         // previous closed bar volume
  if (avgV == null || prevV == null) return null;

  const volConfirm = prevV > avgV * 1.3; // volume must be 30% above average

  // ── Funding rate sentiment filter ────────────────────────────────
  // Avoid entries when funding is extremely one-sided (crowded sentiment)
  const fund = ctx.funding;
  const fundOk = (fund !== null) ? (Math.abs(fund) < 0.003) : true;

  // ── Entry / exit ─────────────────────────────────────────────────
  if (!isChoppy && isTrending && !ctx.position) {
    // Long: trending up + volume surge + funding not extreme
    if (bullish && volConfirm && fundOk) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.90 };
    }
  }

  if (ctx.position > 0) {
    const entryPx = ctx.entryPx || ctx.price;
    // Exit on regime flip to choppy
    if (isChoppy) return { side: 'sell', qty: ctx.position };
    // Exit on trend reversal
    if (bearish)  return { side: 'sell', qty: ctx.position };
    // Stop loss: 4% drop from entry
    if (ctx.price < entryPx * 0.96) return { side: 'sell', qty: ctx.position };
    // Take profit: 8% gain from entry
    if (ctx.price > entryPx * 1.08) return { side: 'sell', qty: ctx.position };
  }

  return null;
}
