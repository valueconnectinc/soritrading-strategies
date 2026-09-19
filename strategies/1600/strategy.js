/*
 * @coinsori-strategy v1
 * name: ETH BB Mean Reversion
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Price touching the lower Bollinger Band often bounces back when
 * RSI confirms oversold conditions — a classic mean-reversion setup.
 * When it buys and sells: Buys when price crosses above the lower band and RSI(14) is below 35
 * (oversold bounce confirmed). Sells when price crosses below the upper band or RSI hits 65+ (overbought).
 * When it does NOT work: In strong trends where price stays at the band for days — the bounce
 * never comes and the position keeps bleeding.
 */
function onUpdate(ctx) {
    const bb    = ctx.bb(20, 2);
    const bbP1  = ctx.bb(20, 2, 1);
    const rsi   = ctx.rsi(14);
    const rsiP1 = ctx.rsi(14, 1);

    if (bb == null || bbP1 == null) return null;
    if (rsi == null || rsiP1 == null) return null;

    const price      = ctx.price;
    const prevClose1 = ctx.closes[1];

    const lower  = bb.lower;
    const upper  = bb.upper;
    const mid    = bb.mid;

    // Price crossed ABOVE lower band on the previous bar (confirming bounce)
    const crossAboveLower = (prevClose1 <= bbP1.lower && price > lower);
    // Price crossed BELOW upper band (overbought exhaustion)
    const crossBelowUpper = (prevClose1 >= bbP1.upper && price < upper);

    const position = ctx.position;

    // === ENTRY: bounce off lower band + RSI confirming oversold (was below 35, now rising) ===
    const rsiOversoldRising = (rsiP1 < 35 && rsi > rsiP1);

    if (crossAboveLower && rsiOversoldRising && position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: price crossed below upper band OR RSI turned overbought ===
    const rsiOverbought = (rsi >= 65);

    if ((crossBelowUpper || rsiOverbought) && position > 0) {
        return { side: 'sell', qty: position };
    }

    return null;
}
