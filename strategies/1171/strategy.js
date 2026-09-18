/*
 * @coinsori-strategy v1
 * name: EMA9/21 Crossover + RSI Confirm — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Faster EMA9/21 golden cross (vs MACD's 12/26) with RSI confirmation.
 * Pure MACD on daily BTC lost -48% because MACD is too slow for crypto's
 * rapid cycles. EMA9/21 is faster, and RSI>50 filter avoids buying in
 * weak momentum — the classic "golden cross + confirm" combo.
 *
 * When it buys:  EMA9 crosses above EMA21 AND RSI(14) > 50 (both agree).
 * When it sells: EMA9 crosses below EMA21 (trend reversal, exit fast).
 *
 * When it does NOT work: in tight range chop EMA9/21 flips repeatedly,
 * burning capital on each whipsaw. In slow grinding trends the exit is
 * late (EMA crossover lags price). 4H gives more data but more noise.
 */

function onUpdate(ctx) {
    const ema9  = ctx.ema(9, 0);
    const ema21 = ctx.ema(21, 0);
    const ema9_1  = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9 == null || ema21 == null || ema9_1 == null || ema21_1 == null) return null;

    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;

    // ── No position — look for entry ──────────────────────────────────────
    if (ctx.position === 0) {
        // EMA9 crosses ABOVE EMA21 (golden cross)
        const crossUp = ema9_1 <= ema21_1 && ema9 > ema21;
        // RSI confirmation: above 50 means bullish momentum
        if (crossUp && rsi > 50) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.995 };
        }
        return null;
    }

    // ── Active long — exit on death cross ─────────────────────────────────
    if (ctx.position > 0) {
        // EMA9 crosses BELOW EMA21 (death cross — exit immediately)
        const crossDown = ema9_1 >= ema21_1 && ema9 < ema21;
        if (crossDown) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    return null;
}
