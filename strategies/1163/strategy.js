/*
 * @coinsori-strategy v1
 * name: EMA9 EMA21 RSI14 Trend
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * EMA9/EMA21 crossover with RSI14 filter. Long on golden cross when RSI > 40
 * (confirming trend, not noise). Short on death cross when RSI < 60.
 * Exit at opposite cross or 10% stop loss.
 * Works in trending markets; whipsaws in choppy conditions.
 */

function onUpdate(ctx) {
    // Warm-up guard — need at least 21 bars
    const ema9  = ctx.ema(9, 0);
    const ema21 = ctx.ema(21, 0);
    const rsi   = ctx.rsi(14, 0);
    if (ema9 == null || ema21 == null || rsi == null) return null;

    // Previous bar values for crossover detection
    const ema9_1  = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    const bullCross = ema9_1 <= ema21_1 && ema9 > ema21;
    const bearCross = ema9_1 >= ema21_1 && ema9 < ema21;

    // ── No position ──────────────────────────────────────────────────────
    if (ctx.position === 0) {
        // Long: golden cross + RSI above 40 (not a fake-out in dead market)
        if (bullCross && rsi > 40) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
        }
        // Short: death cross + RSI below 60
        if (bearCross && rsi < 60) {
            return { side: 'sell', qty: ctx.cash / ctx.price * 0.98 };
        }
        return null;
    }

    // ── Have long — exit on death cross or stop loss ────────────────────
    if (ctx.position > 0) {
        if (bearCross) {
            return { side: 'sell', qty: ctx.position };
        }
        const ret = (ctx.price - ctx.entryPx) / ctx.entryPx;
        if (ret < -0.10) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    // ── Have short — cover on golden cross or stop loss ──────────────────
    if (ctx.position < 0) {
        if (bullCross) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        const ret = (ctx.entryPx - ctx.price) / ctx.entryPx;
        if (ret < -0.10) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        return null;
    }

    return null;
}
