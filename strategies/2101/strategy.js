/*
 * @coinsori-strategy v1
 * name: EMA Cross RSI Filter
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 1000
 *
 * Classic trend-following strategy using EMA crossover with RSI confirmation.
 * Buys when the fast EMA crosses above the slow EMA AND RSI confirms strength above 50.
 * Exits when the fast EMA crosses below the slow EMA OR RSI drops below 40 (weakness).
 * Does not work in choppy, range-bound markets where EMAs criss-cross repeatedly.
 */

function onUpdate(ctx) {
    // Need at least 21 bars for EMA21 to be valid
    const ema9 = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const ema9_1 = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    const rsi = ctx.rsi(14);
    const rsi_1 = ctx.rsi(14, 1);

    if (ema9 == null || ema21 == null || ema9_1 == null || ema21_1 == null) return null;
    if (rsi == null || rsi_1 == null) return null;

    // Buy: EMA9 crosses above EMA21 AND RSI > 50 (confirmed uptrend)
    const emaCrossUp = ema9_1 <= ema21_1 && ema9 > ema21;
    const rsiConfirm = rsi > 50 && rsi_1 <= 50;

    if (emaCrossUp && rsiConfirm && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // Sell: EMA9 crosses below EMA21 OR RSI drops below 40 (weakness signal)
    const emaCrossDown = ema9_1 >= ema21_1 && ema9 < ema21;
    const rsiWeak = rsi < 40 && rsi_1 >= 40;

    if ((emaCrossDown || rsiWeak) && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
