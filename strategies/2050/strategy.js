/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion v3 — EMA9 Exit
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: RSI oversold (<35) reliably bounces in bear/sideways markets (exp 273: +32-39% on ETHUSDT 4H). v1 failed because the ATR stop cut winners short. v2's trailing stop code was buggy. v3 goes back to the exp 273 formula: EMA9 filter on entry, EMA9 cross on exit — no stop-loss, no trailing stop. The EMA9 exit IS the risk management.
 * When it buys and sells: Buys when RSI < 35 AND price > EMA9. Sells when RSI > 65 OR price closes below EMA9.
 * When it does NOT work: Fails in strong sustained downtrends where RSI stays oversold. Also underperforms in sharp bull runs (expected for mean-reversion).
 */
function onUpdate(ctx) {
    if (ctx.i < 55) return null;

    const rsi  = ctx.rsi(14);
    const ema9 = ctx.ema(9);

    if (rsi == null || ema9 == null) return null;

    const price    = ctx.price;
    const position = ctx.position;

    // === EXIT ===
    if (position > 0) {
        // Sell signal 1: RSI reached overbought
        if (rsi > 65) {
            return { side: 'sell', qty: position };
        }
        // Sell signal 2: trend broken (price closed below EMA9)
        if (price < ema9) {
            return { side: 'sell', qty: position };
        }
        return null;
    }

    // === ENTRY ===
    // Buy when RSI oversold AND price above EMA9 (short-term uptrend = dips reverse)
    if (rsi < 35 && price > ema9) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    return null;
}
