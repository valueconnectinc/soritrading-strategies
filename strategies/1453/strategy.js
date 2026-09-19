/*
 * @coinsori-strategy v1
 * name: EMA Momentum with Volume + ATR Risk Management
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL trends strongly in bursts — EMA crossovers catch those moves
 * but generate noise in chop. Adding volume confirmation filters bad signals, and
 * ATR-based stops manage risk in SOL's volatile environment.
 * When it buys and sells: Buys when EMA 9 crosses above EMA 21 with RSI 40-70
 * (not overbought) and volume above its 20-bar average. Sells on reverse crossover
 * or when price trails 2×ATR below position.
 * When it does NOT work: Crashes in non-trending chop (price oscillating around MAs)
 * where crossovers whipsaw. Also fails if SOL gaps down overnight past the stop.
 */
function onUpdate(ctx) {
  // ── Warm-up guard ──────────────────────────────────────────
  const ema9_1  = ctx.ema(9, 1);
  const ema9_2  = ctx.ema(9, 2);
  const ema21_1 = ctx.ema(21, 1);
  const ema21_2 = ctx.ema(21, 2);
  const rsi14   = ctx.rsi(14, 1);
  const atr14   = ctx.atr(14, 1);
  const avgVol  = ctx.avgVol(20);
  const volNow  = ctx.vol;

  if (ema9_1 == null || ema9_2 == null || ema21_1 == null || ema21_2 == null) return null;
  if (rsi14 == null || atr14 == null || avgVol == null || volNow == null) return null;

  // ── Entry: EMA 9 crosses above EMA 21 ───────────────────────
  const bullishCross = ema9_2 <= ema21_2 && ema9_1 > ema21_1;
  // RSI in neutral zone — not overbought, not oversold (avoids late entries)
  const rsiOk = rsi14 > 40 && rsi14 < 70;
  // Volume confirmation — must be above 20-bar average
  const volOk = volNow >= avgVol;

  if (ctx.position === 0 && bullishCross && rsiOk && volOk) {
    // ATR-based stop: risk 1.5×ATR per coin
    const riskPerCoin = atr14 * 1.5;
    const stopPx = ctx.price - riskPerCoin;
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.99,
      type: 'limit',
      price: ctx.price,
      postOnly: false,
    };
  }

  // ── Exit: EMA 9 crosses below EMA 21 ───────────────────────
  const bearishCross = ema9_2 >= ema21_2 && ema9_1 < ema21_1;

  if (ctx.position > 0 && (bearishCross || ctx.price < ctx.entryPx - atr14 * 2)) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
