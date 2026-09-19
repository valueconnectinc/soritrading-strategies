/*
 * @coinsori-strategy v1
 * name: EMA Pullback + RSI Dip Buy
 * ex: binanceusdm
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Thesis: After a strong EMA bull cross, price often pulls back to the 21 EMA
 * before resuming higher. Buying that dip with RSI confirmation catches the
 * resumption at better prices than chasing a breakout. Shorts mirror this
 * for bear rallies.
 *
 * Entry (long): EMA9 > EMA21 AND price crosses BELOW EMA21 (pullback) AND
 *   RSI(14) < 45 (oversold territory, not yet cheap) AND RSI(14) > 30
 *   (still valid, not dead). Exit: price crosses back above EMA9 OR RSI > 65.
 *
 * Entry (short): EMA9 < EMA21 AND price crosses ABOVE EMA21 (dead-cat bounce)
 *   AND RSI > 55 (overbought territory) AND RSI < 70. Exit: price crosses
 *   below EMA9 OR RSI < 35.
 *
 * Loses in: choppy, range-bound markets where price oscillates around the EMA
 * without trend — RSI dip signals fire repeatedly into false moves.
 */

function onUpdate(ctx) {
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const ema50 = ctx.ema(50);
    const rsi   = ctx.rsi(14);
    if (ema9 == null || ema21 == null || rsi == null) return null;

    // Previous bar values for crossover detection
    const prevEma9  = ctx.ema(9,  1);
    const prevEma21 = ctx.ema(21, 1);
    const prevRsi   = ctx.rsi(14, 1);
    if (prevEma9 == null || prevEma21 == null || prevRsi == null) return null;

    // Trend: EMA9 above EMA21 = uptrend, below = downtrend
    const uptrend  = ema9 > ema21;
    const downtrend = ema9 < ema21;

    // === EXIT LOGIC (always check first) ===
    const hasPos = ctx.position > 0;
    const hasShort = ctx.position < 0;

    // Long exit: price crosses above EMA9 or RSI climbs to 65
    if (hasPos) {
        if (ctx.price <= prevEma9 && ctx.price > ema9) {
            return { side: 'sell', qty: ctx.position };
        }
        if (rsi > 65 && prevRsi <= 65) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // Short exit: price crosses below EMA9 or RSI drops to 35
    if (hasShort) {
        if (ctx.price >= prevEma9 && ctx.price < ema9) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        if (rsi < 35 && prevRsi >= 35) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
    }

    // === ENTRY LOGIC ===
    // Long entry: uptrend + pullback to EMA21 + RSI in sweet spot
    if (!hasPos && !hasShort && uptrend) {
        const priceVsEma21 = ctx.price < ema21;    // currently below EMA21 (pullback)
        const prevPriceAbove = ctx.closes[1] >= prevEma21; // previous bar was above EMA21
        const pullbackCross = priceVsEma21 && prevPriceAbove; // cross below
        const rsiDip = rsi > 30 && rsi < 45;       // RSI in oversold-but-not-dead zone

        if (pullbackCross && rsiDip) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // Short entry: downtrend + bounce to EMA21 + RSI in overbought zone
    if (!hasPos && !hasShort && downtrend) {
        const priceVsEma21 = ctx.price > ema21;    // currently above EMA21 (bounce)
        const prevPriceBelow = ctx.closes[1] <= prevEma21; // previous bar was below EMA21
        const bounceCross = priceVsEma21 && prevPriceBelow; // cross above
        const rsiHot = rsi > 55 && rsi < 70;       // RSI in overbought-but-not-peak zone

        if (bounceCross && rsiHot) {
            return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    return null;
}
