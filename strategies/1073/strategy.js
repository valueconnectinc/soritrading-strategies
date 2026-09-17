/*
 * @coinsori-strategy v1
 * name: EMA-9/21 Crossover 1h BTC
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: EMA-9/21 crossover is a classic momentum signal that
 * catches trends early. On 1h bars it reacts faster than daily strategies
 * while avoiding the noise of lower timeframes.
 *
 * When it buys and sells: Buy when EMA-9 crosses above EMA-21 (golden cross)
 * with RSI above 50 (confirming upward momentum). Sell when EMA-9 crosses
 * below EMA-21 (death cross) or when price drops 5% from entry.
 *
 * When it does NOT work: In choppy markets the EMAs whipsaw and generate
 * many false signals — each false cross costs a small loss. Also underperforms
 * in slow grinding trends where the cross fires too late.
 */

function onUpdate(ctx) {
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const rsi   = ctx.rsi(14);
    const price = ctx.price;

    if (ema9 == null || ema21 == null || rsi == null) return null;

    const ema9_1  = ctx.ema(9,  1);
    const ema21_1 = ctx.ema(21, 1);
    const rsi_1   = ctx.rsi(14, 1);
    if (ema9_1 == null || ema21_1 == null || rsi_1 == null) return null;

    const hasPos = ctx.position > 0;

    // Golden cross: EMA-9 crosses above EMA-21
    const goldenCross = ema9_1 <= ema21_1 && ema9 > ema21;
    // RSI confirming upward momentum
    const rsiConfirm = rsi > 50 && rsi > rsi_1;

    if (!hasPos && goldenCross && rsiConfirm) {
        return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.99 };
    }

    // Death cross: EMA-9 crosses below EMA-21
    const deathCross = ema9_1 >= ema21_1 && ema9 < ema21;
    // 5% stop-loss
    const stopLoss = ctx.entryPx > 0 && (ctx.entryPx - price) / ctx.entryPx > 0.05;

    if (hasPos && (deathCross || stopLoss)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
