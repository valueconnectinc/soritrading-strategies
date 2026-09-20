/*
 * @coinsori-strategy v1
 * name: Stochastic Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Uses the Stochastic Oscillator (%K/%D crossover) for mean reversion signals.
 * %K below 20 = deeply oversold; %K crosses above %D while both are below 20 = buy.
 * %K above 80 = deeply overbought; %K crosses below %D while both are above 80 = sell.
 * This is a different signal family from RSI, BB, and EMA — stochastic tracks
 * position within the n-bar range, giving it a natural normalization advantage.
 * When it does NOT work: in strong trends, stochastic stays overbought/oversold
 * for extended periods causing whipsaws; the 20/80 thresholds may be too wide
 * or too narrow for AVAXUSDT's volatility profile.
 */

function onUpdate(ctx) {
    // Stochastic on previous closed bar
    const stoch1 = ctx.stoch(14, 3, 1); // { k, d }
    const stoch2 = ctx.stoch(14, 3, 2);
    if (stoch1 == null || stoch2 == null) return null;
    if (stoch1.k == null || stoch1.d == null || stoch2.k == null || stoch2.d == null) return null;

    // === BUY: %K crosses above %D while both are below 20 ===
    const buySignal = stoch1.k > stoch1.d &&   // K crossed above D now
                      stoch2.k <= stoch2.d &&   // was below or equal D
                      stoch1.k < 20 &&          // both oversold
                      stoch1.d < 20;

    if (ctx.position === 0 && buySignal) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // === SELL: %K crosses below %D while both are above 80 ===
    const sellSignal = stoch1.k < stoch1.d &&   // K crossed below D now
                       stoch2.k >= stoch2.d &&   // was above or equal D
                       stoch1.k > 80 &&          // both overbought
                       stoch1.d > 80;

    if (ctx.position > 0 && sellSignal) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
