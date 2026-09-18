/*
 * @coinsori-strategy v1
 * name: Stochastic Oversold + EMA200 Filter
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Stochastic %K < 20 signals oversold bounces — a different oscillator
 * family than RSI, testing whether the "oversold + trend filter" framework holds across
 * signal types. Stochastic is more sensitive than RSI, potentially catching reversals earlier.
 * When it buys and sells: Buys when Stochastic %K drops below 20 (oversold) AND price is
 * above the 200 EMA (bullish bias confirmation). Sells when %K rises above 60 (mean
 * reversion complete) or price falls below EMA200 (trend broken).
 * When it does NOT work: In strong trending drops where price continues falling despite
 * oversold readings — the EMA200 filter reduces but does not eliminate whipsaws.
 */

function onUpdate(ctx) {
    // Warm-up guard: need EMA200 (≈200 bars) + Stochastic(14) (≈14 bars)
    const ema = ctx.ema(200);
    const sto = ctx.stoch(14, 3); // { k, d }
    if (ema == null || sto == null || sto.k == null || sto.d == null) return null;

    const price = ctx.price;
    const k = sto.k;
    const aboveEMA = price > ema;

    // === ENTRY: Stochastic oversold + price above EMA200 ===
    // %K below 20 = deeply oversold; above-EMA confirms bullish bias
    if (k < 20 && aboveEMA && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: Mean reversion complete OR trend broken ===
    if (ctx.position > 0) {
        // %K above 60 = mean reversion complete, take profit
        if (k > 60) return { side: 'sell', qty: ctx.position };
        // Price dropped below EMA200 = trend broken, exit immediately
        if (!aboveEMA) return { side: 'sell', qty: ctx.position };
    }

    return null;
}
