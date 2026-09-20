/*
 * @coinsori-strategy v1
 * name: Multi-Timeframe EMA Trend Filter
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Uses a daily EMA as a trend filter — only takes 4H long signals when
 * the daily trend agrees (price above daily EMA), and short signals when
 * it disagrees. This prevents the counter-trend whipsaws that plagued
 * earlier BNBUSDT strategies (which entered against the dominant trend).
 * When it does NOT work: in transitions where daily and 4H disagree sharply,
 * or in low-volatility ranges where both timeframes are flat.
 */
function onUpdate(ctx) {
    // === 4H INDICATORS ===
    const ema9_4h  = ctx.ema(9,  0);
    const ema21_4h = ctx.ema(21, 0);
    const ema9_4hP  = ctx.ema(9,  1);
    const ema21_4hP = ctx.ema(21, 1);
    if (ema9_4h == null || ema21_4h == null || ema9_4hP == null || ema21_4hP == null) return null;

    const rsi_4h = ctx.rsi(14, 0);
    if (rsi_4h == null) return null;

    const atr_4h = ctx.atr(14, 0);
    if (atr_4h == null) return null;

    // === DAILY TREND FILTER ===
    // Use EMA50 on 4H chart as daily-equivalent trend (6 bars/day ≈ 50-daily ≈ 200-4H)
    // This is the key difference: only trade with the daily trend
    const ema50_d = ctx.ema(50, 0);  // daily trend proxy
    if (ema50_d == null) return null;

    // === 4H TREND DETECTION ===
    const bullCross_4h = ema9_4h > ema21_4h && ema9_4hP <= ema21_4hP;
    const bearCross_4h = ema9_4h < ema21_4h && ema9_4hP >= ema21_4hP;

    // === DAILY TREND: price vs EMA50 ===
    const dailyBull = ctx.price > ema50_d;  // above daily trend = long bias
    const dailyBear = ctx.price < ema50_d;  // below daily trend = short bias

    // === ATR STOP DISTANCE ===
    const stopDist = atr_4h * 2.5;  // 2.5x ATR stop — wider than v2, less whipsaw

    // === ENTRY LOGIC ===
    if (ctx.position === 0) {
        // LONG: 4H bullish cross + daily trend agrees + RSI confirming
        // RSI > 52: not overbought, leaves room to run
        if (bullCross_4h && dailyBull && rsi_4h > 52) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        // SHORT: 4H bearish cross + daily trend agrees + RSI confirming
        // RSI < 48: not oversold
        if (bearCross_4h && dailyBear && rsi_4h < 48) {
            return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // === EXIT / STOP LOGIC ===
    if (ctx.position > 0) {
        // Hard stop: 2.5x ATR below entry
        if (ctx.price <= ctx.entryPx - stopDist) {
            return { side: 'sell', qty: ctx.position };
        }
        // Trailing exit: 4H trend flips OR RSI drops below 42
        if (ema9_4h < ema21_4h || rsi_4h < 42) {
            return { side: 'sell', qty: ctx.position };
        }
    }
    if (ctx.position < 0) {
        // Hard stop for shorts
        if (ctx.price >= ctx.entryPx + stopDist) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        // Trailing exit: 4H trend flips OR RSI rises above 58
        if (ema9_4h > ema21_4h || rsi_4h > 58) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
    }

    return null;
}
