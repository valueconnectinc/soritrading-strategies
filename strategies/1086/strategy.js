/*
 * @coinsori-strategy v1
 * name: EMA-9/21 Crossover + EMA-100 Trend Filter ETH 4h
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Plain EMA crossover loses in ETH's choppy 4h markets. Adding a longer EMA-100 filter avoids buying during downtrends, cutting the worst whipsaw trades.
 * When it buys and sells: Buy when EMA-9 crosses above EMA-21 AND price is above EMA-100 (confirming bull trend). Sell when EMA-9 crosses below EMA-21.
 * When it does NOT work: In strong sustained trends the filter exits early; also fails when price oscillates around EMA-100 repeatedly.
 */
function onUpdate(ctx) {
    // Fast EMAs for crossover signal
    const ema9_1   = ctx.ema(9, 1);
    const ema21_1  = ctx.ema(21, 1);
    const ema9_2   = ctx.ema(9, 2);
    const ema21_2  = ctx.ema(21, 2);
    // Trend filter: EMA-100 must be valid
    const ema100_1 = ctx.ema(100, 1);

    if (ema9_1 == null || ema21_1 == null || ema9_2 == null || ema21_2 == null) return null;
    if (ema100_1 == null) return null;

    // Bullish cross: fast was below slow, now above
    const bullCross = ema9_2 <= ema21_2 && ema9_1 > ema21_1;
    // Bearish cross: fast was above slow, now below
    const bearCross = ema9_2 >= ema21_2 && ema9_1 < ema21_1;

    // Trend filter: only buy when price is above EMA-100 (trend is bullish)
    const priceAboveTrend = ctx.price > ema100_1;

    if (ctx.position === 0 && bullCross && priceAboveTrend) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    if (ctx.position > 0 && bearCross) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
