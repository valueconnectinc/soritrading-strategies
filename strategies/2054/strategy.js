/*
 * @coinsori-strategy v1
 * name: Dual Oscillator Mean Reversion — EMA200 Filter
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Exp 279 proved dual oscillator (RSI < 35 AND Stochastic %K < 25) + EMA200 filter is the strongest approach for ETHUSDT 4H: +43%/+33%/+20% across 3 walk-forward windows, MDD 3.74%, 112 trades. Beats every momentum/trend-following variant by 40-110pp.
 * When it buys and sells: Buys when both RSI and Stochastic %K are oversold AND price is above EMA200. Sells when RSI > 65 OR price closes below EMA200.
 * When it does NOT work: Fails in strong sustained downtrends where both oscillators stay oversold. Also underperforms in sharp bull runs (expected for mean-reversion).
 */
function onUpdate(ctx) {
    if (ctx.i < 220) return null; // warm-up: EMA200 needs ~200 bars

    const rsi   = ctx.rsi(14);
    const ema200 = ctx.ema(200);
    const stoch  = ctx.stoch(14, 3);

    if (rsi == null || ema200 == null || stoch == null) return null;

    const price    = ctx.price;
    const position = ctx.position;

    // === EXIT ===
    if (position > 0) {
        // Sell signal 1: RSI reached overbought
        if (rsi > 65) {
            return { side: 'sell', qty: position };
        }
        // Sell signal 2: trend broken (price closed below EMA200)
        if (price < ema200) {
            return { side: 'sell', qty: position };
        }
        return null;
    }

    // === ENTRY ===
    // Buy when both oscillators confirm oversold AND price above EMA200 (long-term uptrend)
    if (rsi < 35 && stoch.k < 25 && price > ema200) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    return null;
}
