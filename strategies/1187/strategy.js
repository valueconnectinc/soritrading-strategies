/*
 * @coinsori-strategy v1
 * name: BB RSI EMA200 with DXY Macro Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The best result in this job was BB lower-band + RSI<35 + EMA200 (exp 288: +8.5%, MDD 17%, promising). Adding DXY macro filter to block buy entries during strong-USD regimes — when DXY > 104, crypto faces macro headwinds that make mean-reversion bounces unreliable.
 * When it buys and sells: Buy when price hits BB lower band AND RSI < 35 (double oversold confirmation) AND EMA200 rising (structural uptrend intact) AND DXY < 104 (no macro headwind). Sell when price reaches BB middle band (mean reversion target).
 * When it does NOT work: In sharp single-session crashes DXY lags the move and the filter doesn't help. In prolonged bear markets where EMA200 is falling, no entries trigger at all — the strategy sits idle and misses any bounce.
 */
function onUpdate(ctx) {
  // === Indicators ===
  const ema200 = ctx.ema(200);
  const rsi   = ctx.rsi(14);
  const bb    = ctx.bb(20, 2);

  if (ema200 == null || rsi == null || bb == null) return null;

  // === Macro filter ===
  const dxy = ctx.macro('dxy');
  const dxyOk = (dxy == null || dxy < 104); // skip buys when USD is strong

  // === Bollinger band levels ===
  const lower = bb.lower;
  const mid   = bb.mid;
  const price = ctx.price;

  // === Trend: EMA200 must be rising (not falling) ===
  const ema200Rising = price > ema200;

  // ── ENTRY: double oversold + trend OK + macro OK ─────────────────────────
  if (ctx.position === 0 && dxyOk) {
    // Price at or below BB lower band (touched support)
    const atLower = price <= lower;
    // RSI confirming oversold
    const rsiOversold = rsi < 35;
    // Structural uptrend intact
    const trendOk = ema200Rising;

    if (atLower && rsiOversold && trendOk) {
      // Risk 2% of cash per trade, position size by ATR
      const atr  = ctx.atr(14);
      const risk = ctx.cash * 0.02;
      const qty  = atr > 0 ? risk / atr : 0;
      return { side: 'buy', qty };
    }
  }

  // ── EXIT: price at BB middle band (mean-reversion target) ────────────────
  if (ctx.position > 0) {
    // Take profit at BB middle band
    if (price >= mid) {
      return { side: 'sell', qty: ctx.position };
    }
    // Stop: price below BB lower band (worsening — don't hold through a breakdown)
    if (price < lower) {
      return { side: 'sell', qty: ctx.position };
    }
    // Stop: EMA200 trend broken (price fell below EMA200 — structural breakdown)
    if (price < ema200) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
