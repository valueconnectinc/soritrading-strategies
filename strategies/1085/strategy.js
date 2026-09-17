/*
 * @coinsori-strategy v1
 * name: EMA-9/21 Crossover Simple ETH 4h
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossover is the simplest momentum signal — when the fast EMA crosses above the slow EMA, the trend is shifting bullish. No histogram, no volume filter, just pure price momentum.
 * When it buys and sells: Buy when EMA-9 crosses above EMA-21. Sell when EMA-9 crosses below EMA-21.
 * When it does NOT work: Choppy ETH where EMAs weave without a clean cross — each false cross costs fees.
 */
function onUpdate(ctx) {
    const ema9_1  = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    const ema9_2  = ctx.ema(9, 2);
    const ema21_2 = ctx.ema(21, 2);

    // Guard: need at least 21 bars for EMA-21 to be valid
    if (ema9_1 == null || ema21_1 == null || ema9_2 == null || ema21_2 == null) return null;

    // Bullish cross: fast was below slow, now above
    const bullCross = ema9_2 <= ema21_2 && ema9_1 > ema21_1;
    // Bearish cross: fast was above slow, now below
    const bearCross = ema9_2 >= ema21_2 && ema9_1 < ema21_1;

    if (ctx.position === 0 && bullCross) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    if (ctx.position > 0 && bearCross) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
