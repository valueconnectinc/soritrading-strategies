/*
 * @coinsori-strategy v1
 * name: EMA9/21 Trend Following
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when EMA9 crosses above EMA21 (uptrend confirmed) and holds until EMA9
 * crosses back below EMA21 (trend reversal). RSI filter avoids false crossovers
 * in choppy markets.
 * When it does NOT work: choppy, directionless markets where EMAs criss-cross
 * repeatedly — generates whipsaws and small losses that compound via fees.
 */
function onUpdate(ctx) {
    // Warm-up: need at least 50 bars for EMAs and RSI
    if (ctx.i < 50) return null;

    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const rsi   = ctx.rsi(14);
    const atr   = ctx.atr(14);

    if (ema9 == null || ema21 == null || rsi == null || atr == null) return null;

    // Previous bar values for crossover detection
    const ema9_1  = ctx.ema(9,  1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    const price = ctx.price;
    const noPos = ctx.position === 0;

    // ── BUY: EMA9 crosses ABOVE EMA21 (bullish crossover)
    // RSI filter: only enter when RSI > 50 (confirming upward momentum)
    // Avoid chop: require RSI rising on this bar (momentum building)
    const rsiRising = ctx.rsi(14, 1) != null && ctx.rsi(14, 1) < rsi;
    const bullCross = ema9_1 <= ema21_1 && ema9 > ema21;
    const rsiConfirm = rsi > 50;

    if (noPos && bullCross && rsiConfirm && rsiRising) {
        // Stop loss: 2× ATR below entry, capped at 5%
        const stopPx = price - Math.min(atr * 2, price * 0.05);
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            stopLoss: stopPx
        };
    }

    // ── SELL: EMA9 crosses BELOW EMA21 (bearish crossover) OR RSI drops below 40
    if (ctx.position > 0) {
        const bearCross = ema9_1 >= ema21_1 && ema9 < ema21;
        const rsiWeak = rsi < 40;

        if (bearCross || rsiWeak) {
            return { side: 'sell', qty: ctx.position };
        }

        // Trailing stop: if price drops 3% from peak, exit
        const peak = ctx.entryPx; // simplified: use entry as reference
        if (price <= peak * 0.97) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
