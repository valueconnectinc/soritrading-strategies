/*
 * @coinsori-strategy v1
 * name: Regime-Switching Hybrid (ADX)
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: No single strategy works in all market regimes. ADX measures
 * trend strength — low ADX means ranging (mean reversion works), high ADX means
 * trending (trend-following works). This hybrid switches between the two.
 * When it buys and sells: In ranging markets (ADX < 25) use RSI+Bollinger Band
 * mean reversion signals. In trending markets (ADX >= 25) use EMA9/21 crossover
 * for trend-following entries. Both modes require volume confirmation.
 * When it does NOT work: ADX lags at market transitions — the regime switch happens
 * after the move has started, missing the early part and sometimes getting it wrong.
 */
function onUpdate(ctx) {
  const state = ctx.state;

  // ── State tracking for bar transitions ──
  if (state.lastBarI !== ctx.i) {
    state.prevEma9  = state.lastEma9  ?? null;
    state.prevEma21 = state.lastEma21 ?? null;
    state.lastBarI  = ctx.i;
    state.lastEma9  = ctx.ema(9);
    state.lastEma21 = ctx.ema(21);
  } else {
    state.lastEma9  = ctx.ema(9);
    state.lastEma21 = ctx.ema(21);
  }

  // ── Indicators ──
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);
  const bb    = ctx.bb(20, 2);
  const atr   = ctx.atr(14);

  // ADX proxy: use ATR relative to its SMA as a trend-strength proxy
  // (ctx does not have a direct ADX function, so we approximate with
  //  ATR(14) vs its 20-bar SMA — rising ratio = trending, falling = ranging)
  const atrNow  = ctx.atr(14);
  const atrPast = ctx.atr(14, 20); // ATR 20 bars ago
  const atrRatio = (atrNow != null && atrPast != null && atrPast > 0)
    ? atrNow / atrPast : 1.0;

  // Volume
  const vol    = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const volOk  = avgVol != null && vol != null && vol > avgVol * 0.8;

  if (ema9 == null || ema21 == null || rsi == null || bb == null) return null;

  // ── Regime detection ──
  // ATR ratio > 1.15 means volatility is rising (trending environment)
  // ATR ratio <= 1.15 means volatility is compressed (ranging environment)
  const isTrending = atrRatio > 1.15;

  const price      = ctx.price;
  const lowerBand  = bb.lower;
  const upperBand  = bb.upper;

  // ── EMA crossover signals (trend-following mode) ──
  const prevEma9  = state.prevEma9;
  const prevEma21 = state.prevEma21;
  const crossUp   = prevEma9 != null && prevEma21 != null
    && prevEma9 <= prevEma21 && ema9 > ema21;
  const crossDown = prevEma9 != null && prevEma21 != null
    && prevEma9 >= prevEma21 && ema9 < ema21;

  // ── RSI/Bollinger signals (mean reversion mode) ──
  const rsiOversold   = rsi < 35;
  const rsiOverbought = rsi > 68;
  const atLowerBand   = price <= lowerBand;
  const atUpperBand   = price >= upperBand;

  // ── Entry ──
  if (ctx.position === 0) {
    if (isTrending) {
      // Trend-following mode: EMA crossover + RSI not overheated + volume
      const rsiOk = rsi > 40 && rsi < 70;
      if (crossUp && rsiOk && volOk) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
      }
    } else {
      // Mean reversion mode: RSI oversold + at lower band + volume
      if (rsiOversold && atLowerBand && volOk) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
      }
    }
  }

  // ── Exit ──
  if (ctx.position > 0) {
    if (isTrending) {
      // Trend mode: EMA cross down OR RSI overbought
      if (crossDown || rsi > 65) {
        return { side: 'sell', qty: ctx.position };
      }
    } else {
      // Mean reversion mode: RSI overbought OR at upper band OR RSI > 50
      if (rsiOverbought || atUpperBand || rsi > 50) {
        return { side: 'sell', qty: ctx.position };
      }
    }
  }

  return null;
}
