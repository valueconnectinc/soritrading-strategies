/*
 * @coinsori-strategy v1
 * name: Stochastic Momentum + ATR
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Stochastic %K is more responsive than RSI to price swings,
 * especially useful on 4h where momentum shifts happen faster. Combined with ATR
 * stop it adapts to SOL's volatility regime.
 * When it buys and sells: Buys when %K crosses above %D while both are below 20
 * (deeply oversold with upward momentum). Sells when %K crosses below %D above 80
 * or ATR stop is hit.
 * When it does NOT work: In slow grinding trends where %K/%D stay extended for
 * long periods — the strategy exits too early and misses the move.
 */
function onUpdate(ctx) {
    const stoch1 = ctx.stoch(14, 3, 1);
    const stoch2 = ctx.stoch(14, 3, 2);
    if (stoch1 == null || stoch2 == null) return null;

    const k1 = stoch1.k;
    const d1 = stoch1.d;
    const k2 = stoch2.k;
    const d2 = stoch2.d;
    if (k1 == null || d1 == null || k2 == null || d2 == null) return null;

    const atr = ctx.atr(14, 1);
    if (atr == null) return null;

    const price = ctx.price;
    const position = ctx.position;
    const entryPx = ctx.entryPx;

    // BUY: %K crosses above %D while both are in oversold zone (< 20)
    const kCrossUp = k2 <= d2 && k1 > d1;
    const inOversold = k1 < 20 && d1 < 20;
    if (kCrossUp && inOversold && position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // SELL: %K crosses below %D in overbought zone (> 80) OR ATR stop hit
    if (position > 0) {
        const stopPx = entryPx - 2 * atr;
        const dCrossDown = k2 > d2 && k1 <= d1;
        const inOverbought = k1 > 80 && d1 > 80;
        if (price <= stopPx || (dCrossDown && inOverbought)) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
