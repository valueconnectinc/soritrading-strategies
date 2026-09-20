/*
 * @coinsori-strategy v1
 * name: Momentum Breakout with RSI Filter
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Momentum breakouts work well on 4h AVAX — when price clears a
 * 20-bar high with RSI confirming strength, the move tends to continue.
 * When it buys and sells: Buys when price closes above the 20-bar highest high AND
 * RSI(14) is above 50 (confirming bullish momentum). Sells when price closes below
 * the 20-bar lowest low OR RSI drops below 40 (momentum weakening).
 * When it does NOT work: Choppy/ranging markets — repeated false breakouts burn
 * through cash. Works best in trending markets with clear direction.
 */
function onUpdate(ctx) {
    // Need at least 20 bars for highest/lowest calculations
    const hh20 = ctx.high(20, 1); // highest high 20 bars ago (closed bar)
    const ll20 = ctx.low(20, 1);
    const rsi = ctx.rsi(14, 1);
    const price = ctx.price;

    if (hh20 == null || ll20 == null || rsi == null) return null;

    // Entry: price breaks above 20-bar high, RSI confirming bullish (>50)
    const longCondition = price > hh20 && rsi > 50;

    // Exit: price breaks below 20-bar low OR RSI drops below 40
    const shortCondition = price < ll20 || rsi < 40;

    if (ctx.position === 0 && longCondition) {
        // Buy with 99% of available cash
        return { side: 'buy', qty: (ctx.cash / price) * 0.99 };
    }

    if (ctx.position > 0 && shortCondition) {
        // Sell entire position
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
