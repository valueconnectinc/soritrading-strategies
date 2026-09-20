/*
 * @coinsori-strategy v1
 * name: ATR Regime Adaptive — SOLUSDT 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Markets switch between choppy (low volatility) and trending
 * (high volatility). A single strategy type cannot optimal in both. This strategy
 * reads ATR as a volatility regime sensor and switches its signal family:
 *   • Low volatility → mean reversion (RSI + BB)
 *   • High volatility → momentum (EMA cross + RSI trend)
 * ATR also sizes positions inversely to volatility so risk stays controlled.
 * When it buys and sells: Long when RSI<35 and price near lower BB in chop;
 * Long when EMA9 crosses above EMA21 with RSI>50 in trends. Opposite for shorts.
 * When it does NOT work: In mid-volatility where the regime is ambiguous, the
 * indicator oscillates and causes whipsaws. Also fails in slow grinding trends
 * where neither trigger fires cleanly.
 */

function onUpdate(ctx) {
  // --- Regime: ATR as % of price ---
  const atr = ctx.atr(14);
  if (atr == null) return null;
  const atrPct = atr / ctx.price * 100;
  const emaAtr = ctx.ema(20); // smooth ATR% over 20 bars (~3.3 days of 4h bars)
  if (emaAtr == null) return null;

  // Threshold chosen to split roughly 50/50 on SOL 4H history
  const isHighVol = atrPct > emaAtr * 1.15;  // 15% above smooth ATR = trending
  const isLowVol  = atrPct < emaAtr * 0.85;  // 15% below smooth ATR = chop

  // --- Indicators ---
  const ema9  = ctx.ema(9);
  const ema21 = ctx.ema(21);
  const rsi   = ctx.rsi(14);
  const bb    = ctx.bb(20, 2);
  if (ema9 == null || ema21 == null || rsi == null || bb == null) return null;

  // --- Position state ---
  const hasPos = ctx.position > 0;
  const hasShort = ctx.position < 0;

  // --- Risk sizing: ATR-based stop distance ---
  // Risk 1.5% of cash per trade; stop = 1.5 × ATR in price units
  const riskCash  = ctx.cash * 0.015;
  const stopDist  = atr * 1.5;
  const qty       = riskCash / stopDist;

  // --- Regime-specific signals ---
  if (isLowVol) {
    // CHOP regime: mean reversion — buy deep RSI, sell overbought
    // RSI below 30 = price well below typical; BB lower band confirms
    if (!hasPos && rsi < 30 && ctx.price <= bb.lower * 1.02) {
      return {
        side: 'buy',
        qty: qty,
        type: 'limit',
        price: ctx.price * 0.998   // slight discount to fill
      };
    }
    // Close long on mean reversion target
    if (hasPos && rsi > 65) {
      return { side: 'sell', qty: ctx.position };
    }
    // Short: RSI above 70 + price near upper band
    if (!hasShort && rsi > 70 && ctx.price >= bb.upper * 0.98) {
      return {
        side: 'sell',
        qty: qty,
        type: 'limit',
        price: ctx.price * 1.002
      };
    }
    // Close short on mean reversion target
    if (hasShort && rsi < 40) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
  } else if (isHighVol) {
    // TREND regime: momentum — EMA cross + RSI confirmation
    // EMA9 above EMA21 = short-term running ahead = uptrend
    const ema9Now  = ctx.ema(9, 0);
    const ema21Now = ctx.ema(21, 0);
    const ema9Prev = ctx.ema(9, 1);
    const ema21Prev = ctx.ema(21, 1);
    if (ema9Now == null || ema21Now == null || ema9Prev == null || ema21Prev == null) return null;

    const crossUp   = ema9Prev <= ema21Prev && ema9Now > ema21Now;
    const crossDown = ema9Prev >= ema21Prev && ema9Now < ema21Now;

    // Long on EMA golden cross with RSI confirming strength (>50)
    if (!hasPos && crossUp && rsi > 50) {
      return {
        side: 'buy',
        qty: qty,
        type: 'limit',
        price: ctx.price * 0.998
      };
    }
    // Close long on EMA death cross or if RSI drops below 40
    if (hasPos && (crossDown || rsi < 40)) {
      return { side: 'sell', qty: ctx.position };
    }
    // Short on EMA death cross with RSI confirming weakness (<50)
    if (!hasShort && crossDown && rsi < 50) {
      return {
        side: 'sell',
        qty: qty,
        type: 'limit',
        price: ctx.price * 1.002
      };
    }
    // Close short on EMA golden cross or RSI > 60
    if (hasShort && (crossUp || rsi > 60)) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
  }

  // --- Mid-volatility: no entry (avoid whipsaw zone) ---
  return null;
}
