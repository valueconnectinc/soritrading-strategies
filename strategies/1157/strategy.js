/*
 * @coinsori-strategy v1
 * name: RSI + Stochastic Dual Oversold + EMA200 Filter
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Both RSI oversold and Stochastic oversold + EMA200 worked individually
 * (+27-33% and +36-41% respectively). Combining them into a dual-confirmation entry requires
 * BOTH oscillators to signal oversold simultaneously, filtering out weaker reversal setups
 * and improving win rate. Fewer trades but higher conviction.
 * When it buys and sells: Buys when RSI < 35 AND Stochastic %K < 25 AND price above EMA200.
 * Sells when RSI > 60 OR Stochastic %K > 65 OR price drops below EMA200.
 * When it does NOT work: In slow grinding rallies where only one oscillator fires — these
 * setups are missed. The stricter filter reduces total trades significantly.
 */

function onUpdate(ctx) {
    // Warm-up: EMA200 (≈200 bars), RSI(14), Stochastic(14)
    const ema  = ctx.ema(200);
    const rsi  = ctx.rsi(14);
    const sto  = ctx.stoch(14, 3);
    if (ema == null || rsi == null || sto == null || sto.k == null || sto.d == null) return null;

    const price   = ctx.price;
    const aboveEMA = price > ema;

    // === ENTRY: BOTH oscillators oversold + trend confirmed ===
    // RSI < 35 = oversold (softer than 30, more signals)
    // Stochastic %K < 25 = oversold (dual confirmation)
    // Both must fire together = very high conviction
    if (ctx.position === 0 && rsi < 35 && sto.k < 25 && aboveEMA) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: either oscillator mean-reverts OR trend breaks ===
    if (ctx.position > 0) {
        // RSI mean-reverted to neutral-overbought zone
        if (rsi > 60) return { side: 'sell', qty: ctx.position };
        // Stochastic mean-reverted
        if (sto.k > 65) return { side: 'sell', qty: ctx.position };
        // Trend broken — price below EMA200
        if (!aboveEMA) return { side: 'sell', qty: ctx.position };
    }

    return null;
}
