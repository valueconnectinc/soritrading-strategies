/*
 * @coinsori-strategy v1
 * name: EMA Crossover No Filter 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Plain EMA-5/13 crossover — no filters, no stops, to
 * confirm the indicator pipeline works. Will be noisy but should generate
 * trades on every cross.
 * When it buys and sells: Buy on EMA-5 cross above EMA-13. Sell on reverse.
 * When it does NOT work: Choppy markets generate many whipsaws.
 */

function onUpdate(ctx) {
    const ema5  = ctx.ema(5);
    const ema13 = ctx.ema(13);
    if (ema5 == null || ema13 == null) return null;

    const ema5_1  = ctx.ema(5, 1);
    const ema13_1 = ctx.ema(13, 1);
    if (ema5_1 == null || ema13_1 == null) return null;

    // EMA-5 crosses above EMA-13
    if (ctx.position === 0 && ema13_1 <= ema5_1 && ema5 > ema13) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // EMA-5 crosses below EMA-13
    if (ctx.position > 0 && ema13_1 >= ema5_1 && ema13 < ema5) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
