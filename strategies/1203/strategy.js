/*
 * @coinsori-strategy v1
 * name: EMA Crossover + RSI Filter 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Momentum trend strategy on 4-hourly ETHUSDT. Buys when EMA9 crosses
 * above EMA21 AND RSI(14) is above 50 (confirming upward momentum).
 * Sells when EMA9 crosses below EMA21 (trend reversal) or RSI drops
 * below 40 (momentum weakening).
 * Why 4H: enough data density for signals, smooth enough to avoid
 * noise that plagues 15M. ETHUSDT 4H has consistent trend cycles.
 * When it does NOT work: choppy markets where EMAs cross repeatedly —
 * this generates whipsaws with small losses that erode capital.
 */

function onUpdate(ctx) {
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const rsi   = ctx.rsi(14);
    const price = ctx.price;
    const hasPos = ctx.position > 0;

    if (ema9 == null || ema21 == null || rsi == null) return null;

    // Previous bar values for crossover detection
    const ema9_1  = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    // ── BUY: EMA9 crosses above EMA21 + RSI > 50
    if (!hasPos) {
        const crossedUp = ema21_1 >= ema9_1 && ema9 > ema21;
        if (crossedUp && rsi > 50) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    // ── SELL: EMA9 crosses below EMA21 (trend reversal)
    if (hasPos) {
        const crossedDown = ema21_1 <= ema9_1 && ema9 < ema21;
        if (crossedDown) {
            return { side: 'sell', qty: ctx.position };
        }
        // Secondary exit: RSI drops below 40 (momentum weakening)
        const rsi_1 = ctx.rsi(14, 1);
        if (rsi_1 != null && rsi_1 >= 40 && rsi < 40) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
