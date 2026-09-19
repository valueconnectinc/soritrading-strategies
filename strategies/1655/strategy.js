/*
 * @coinsori-strategy v1
 * name: RSI Momentum with EMA Trend Filter
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI momentum zone strategy: buy when RSI enters oversold in a confirmed uptrend,
 * sell when RSI enters overbought in a confirmed downtrend. The EMA(50) trend filter
 * ensures we only buy dips (not falling knives) and only short rallies (not dead-cat bounces).
 * When it buys and sells: enters long when RSI < 40 and EMA50 > EMA200 (uptrend confirmed);
 * exits when RSI > 60 or EMA50 < EMA200. Shorts when RSI > 60 and EMA50 < EMA200.
 * When it does NOT work: in choppy markets where RSI oscillates around thresholds
 * without clear trend, it generates whipsaws. Also fails in strong one-directional moves
 * where RSI stays extended.
 */

function onUpdate(ctx) {
    // Warm-up: need 200 bars for EMA200
    const ema50_1 = ctx.ema(50, 1);
    const ema200_1 = ctx.ema(200, 1);
    const ema50_2 = ctx.ema(50, 2);
    const ema200_2 = ctx.ema(200, 2);
    if (ema50_1 == null || ema200_1 == null || ema50_2 == null || ema200_2 == null) return null;

    // RSI and ATR
    const rsi_0 = ctx.rsi(14);
    const rsi_1 = ctx.rsi(14, 1);
    if (rsi_0 == null || rsi_1 == null) return null;
    const atr = ctx.atr(14);
    if (atr == null) return null;

    // Position check
    const hasPos = ctx.position > 0;
    const hasShort = ctx.position < 0;

    // Trend: EMA50 > EMA200 = uptrend, EMA50 < EMA200 = downtrend
    const emaUp = ema50_1 > ema200_1;
    const emaDown = ema50_1 < ema200_1;

    // ATR stop distance (1.5x ATR from entry)
    const stopPx = ctx.price - 1.5 * atr; // long stop below
    const shortStopPx = ctx.price + 1.5 * atr; // short stop above

    // === LONG ENTRY: RSI crosses below 40 in uptrend ===
    if (!hasPos && !hasShort && emaUp) {
        // RSI crossed below 40 (was above 40 last bar, now below)
        if (rsi_1 >= 40 && rsi_0 < 40) {
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.99,
                stopPx: stopPx
            };
        }
    }

    // === SHORT ENTRY: RSI crosses above 60 in downtrend ===
    if (!hasPos && !hasShort && emaDown) {
        // RSI crossed above 60 (was below 60 last bar, now above)
        if (rsi_1 <= 60 && rsi_0 > 60) {
            return {
                side: 'sell',
                qty: Math.abs(ctx.cash / ctx.price * 0.99),
                stopPx: shortStopPx
            };
        }
    }

    // === EXIT LONG ===
    if (hasPos) {
        // Exit on trend reversal: EMA50 crosses below EMA200
        if (ema50_1 < ema200_1 && ema50_2 >= ema200_2) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit on RSI reaching overbought zone
        if (rsi_0 > 70) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // === EXIT SHORT ===
    if (hasShort) {
        // Exit on trend reversal: EMA50 crosses above EMA200
        if (ema50_1 > ema200_2 && ema50_2 <= ema200_2) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        // Exit on RSI reaching oversold zone
        if (rsi_0 < 30) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
    }

    return null;
}
