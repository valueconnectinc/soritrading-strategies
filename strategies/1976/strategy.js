/*
 * @coinsori-strategy v1
 * name: EMA Crossover + RSI Filter
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * EMA(9) / EMA(21) golden/death cross with RSI filter to avoid chop.
 * Previous experiments on AVAXUSDT 4h: momentum strategies (exp 414, 475)
 * all failed due to whipsawing. This adds an RSI filter — only take a
 * long when RSI < 55 (not overbought), only take a short when RSI > 45.
 * Entry: EMA9 crosses above EMA21 + RSI < 55 → buy.
 * Exit:   EMA9 crosses below EMA21 + RSI > 45 → sell.
 * When it does NOT work: in strong trends RSI never re-enters the filter
 * zone so the strategy misses the early move; in choppy markets even the
 * RSI filter cannot prevent all whipsaws.
 */

function onUpdate(ctx) {
    // EMA crossovers on previous closed bars
    const ema9_1  = ctx.ema(9,  1);
    const ema21_1 = ctx.ema(21, 1);
    const ema9_2  = ctx.ema(9,  2);
    const ema21_2 = ctx.ema(21, 2);
    if (ema9_1 == null || ema21_1 == null || ema9_2 == null || ema21_2 == null) return null;

    // RSI on previous closed bar
    const rsi1 = ctx.rsi(14, 1);
    if (rsi1 == null) return null;

    // === GOLDEN CROSS: EMA9 crosses above EMA21 ===
    // Was below (or equal), now above
    const wasBelow = ema9_2 <= ema21_2;
    const nowAbove = ema9_1 > ema21_1;

    // === DEATH CROSS: EMA9 crosses below EMA21 ===
    const wasAbove = ema9_2 >= ema21_2;
    const nowBelow = ema9_1 < ema21_1;

    // Long entry: golden cross + RSI not overbought
    if (ctx.position === 0 && wasBelow && nowAbove && rsi1 < 55) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // Short exit: death cross + RSI not oversold
    if (ctx.position > 0 && wasAbove && nowBelow && rsi1 > 45) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
