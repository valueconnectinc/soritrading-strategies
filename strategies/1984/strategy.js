/*
 * @coinsori-strategy v1
 * name: BTC EMA Momentum ATR Trail
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Fast EMA crossover momentum strategy with ATR trailing stop.
 * Uses 9/21 EMA cross for direction, RSI to avoid fakeouts, and ATR-based stop to hold trends.
 * Does not work in choppy markets with many EMA crosses — each cross triggers a trade with costs.
 */
function onUpdate(ctx) {
    const ema9_1 = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    const ema9_2 = ctx.ema(9, 2);
    const ema21_2 = ctx.ema(21, 2);
    const rsi0 = ctx.rsi(14, 0);
    const atr0 = ctx.atr(14, 0);
    if (ema9_1 == null || ema21_1 == null || ema9_2 == null || ema21_2 == null) return null;
    if (rsi0 == null || atr0 == null) return null;

    const price = ctx.price;
    const position = ctx.position;
    const entryPx = ctx.entryPx;

    // === EMA CROSSOVER (trend direction) ===
    // Bull cross: fast EMA crosses above slow EMA
    const bullCross = ema9_2 <= ema21_2 && ema9_1 > ema21_1;
    // Bear cross: fast EMA crosses below slow EMA
    const bearCross = ema9_2 >= ema21_2 && ema9_1 < ema21_1;

    // RSI filter: avoid entries when overbought/oversold extremes (fakeout zone)
    const rsiOk = rsi0 > 35 && rsi0 < 68;

    // === ENTRY ===
    if (!position && bullCross && rsiOk) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT / STOP ===
    if (position) {
        // Bear cross: exit immediately
        if (bearCross) {
            return { side: 'sell', qty: position };
        }
        // ATR trailing stop: price must stay within 2x ATR of entry
        // If price drops more than 2 ATR from entry, exit
        const stopDist = 2 * atr0;
        if (price < entryPx - stopDist) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
