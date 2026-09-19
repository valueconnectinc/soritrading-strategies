/*
 * @coinsori-strategy v1
 * name: EMA9/21 Crossover with Volume Confirmation
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Simple EMA(9) / EMA(21) crossover with volume confirmation.
 * Why this strategy: SOL trades in strong trends — EMA crossover catches momentum
 * without the lag of longer EMAs. Volume confirms the move is real.
 * When it buys and sells: Buy when EMA9 crosses above EMA21 with above-average volume.
 * Sell when EMA9 crosses below EMA21.
 * When it does NOT work: In choppy markets with no clear trend, EMAs produce
 * many false crosses; whipsaws eat into returns.
 */
function onUpdate(ctx) {
    // Need at least 21 bars for EMA21
    const ema9 = ctx.ema(9);
    const ema21 = ctx.ema(21);
    if (ema9 == null || ema21 == null) return null;

    // Volume confirmation: require above-average volume on the signal bar
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volOk = ctx.vol > avgVol;

    // Previous bar's EMA values for crossover detection
    const ema9_1 = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    // Crossover: EMA9 crosses above EMA21
    const bullCross = ema9_1 <= ema21_1 && ema9 > ema21;
    // Crossunder: EMA9 crosses below EMA21
    const bearCross = ema9_1 >= ema21_1 && ema9 < ema21;

    // No position — look for buy
    if (ctx.position === 0) {
        // Buy on bull EMA cross with volume confirmation
        if (bullCross && volOk) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        return null;
    }

    // Have position — look for sell
    if (ctx.position > 0) {
        // Sell on bear EMA cross
        if (bearCross) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    return null;
}
