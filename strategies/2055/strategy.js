/*
 * @coinsori-strategy v1
 * name: Dual Oscillator Mean Reversion — EMA50 Filter
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA200 filter (strategy 2054) was too strict — only 4 trades in the oldest window, 0 in the middle. EMA50 is a middle ground: more responsive than EMA200, still excludes strong sustained downtrends. Dual oscillator (RSI < 35 AND Stochastic %K < 25) provides high-conviction entries.
 * When it buys and sells: Buys when both RSI and Stochastic %K are oversold AND price is above EMA50. Sells when RSI > 65 OR price closes below EMA50.
 * When it does NOT work: Fails in strong sustained downtrends where both oscillators stay oversold. Also underperforms in sharp bull runs (expected for mean-reversion).
 */
function onUpdate(ctx) {
    if (ctx.i < 60) return null; // warm-up: EMA50 needs ~50 bars

    const rsi   = ctx.rsi(14);
    const ema50 = ctx.ema(50);
    const stoch  = ctx.stoch(14, 3);

    if (rsi == null || ema50 == null || stoch == null) return null;

    const price    = ctx.price;
    const position = ctx.position;

    // === EXIT ===
    if (position > 0) {
        // Sell signal 1: RSI reached overbought
        if (rsi > 65) {
            return { side: 'sell', qty: position };
        }
        // Sell signal 2: trend broken (price closed below EMA50)
        if (price < ema50) {
            return { side: 'sell', qty: position };
        }
        return null;
    }

    // === ENTRY ===
    // Buy when both oscillators confirm oversold AND price above EMA50 (medium-term uptrend)
    if (rsi < 35 && stoch.k < 25 && price > ema50) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    return null;
}
