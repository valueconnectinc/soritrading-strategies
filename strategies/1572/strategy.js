/*
 * @coinsori-strategy v1
 * name: EMA Crossover 9-21
 * ex: binance
 * syms: SUIUSDT
 * interval: 4h
 * cash: 1000
 *
 * A classic dual EMA crossover strategy. Buys when the 9-period EMA crosses
 * above the 21-period EMA (golden cross), sells when it crosses back below
 * (death cross). No additional filters — pure trend-following.
 * Buys: EMA9 crosses above EMA21.
 * Sells: EMA9 crosses below EMA21.
 * Does NOT work: In choppy markets with whipsaws and false crosses.
 */

function onUpdate(ctx) {
    const price = ctx.price;
    const ema9 = ctx.ema(9);
    const ema21 = ctx.ema(21);

    if (ema9 == null || ema21 == null) return null;

    const hasPosition = ctx.position > 0;

    // Previous bar's EMAs for crossover detection
    const ema9Prev = ctx.ema(9, 1);
    const ema21Prev = ctx.ema(21, 1);
    if (ema9Prev == null || ema21Prev == null) return null;

    if (!hasPosition) {
        // Golden cross: fast crossed above slow
        if (ema9Prev <= ema21Prev && ema9 > ema21) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    } else {
        // Death cross: fast crossed below slow
        if (ema9Prev >= ema21Prev && ema9 < ema21) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
