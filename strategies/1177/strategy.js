/*
 * @coinsori-strategy v1
 * name: EMA9/21 Crossover — BTCUSDT 1d Simple
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Classic EMA 9/21 golden cross — buys when the fast EMA crosses above the
 * slow EMA (bullish trend confirmed), sells when it crosses back below
 * (trend exhausted). No volume filter to avoid the false-negative problem
 * that killed the previous volume-EMA strategy.
 * When it does NOT work: choppy markets where EMAs weave in and out,
 * generating whipsaws. BTC's high correlation with宏观 events means the
 * crossover often fires late at the top of moves.
 */

function onUpdate(ctx) {
    const ema9  = ctx.ema(9, 1);
    const ema21 = ctx.ema(21, 1);
    const ema9_prev  = ctx.ema(9, 2);
    const ema21_prev = ctx.ema(21, 2);
    if (ema9 == null || ema21 == null || ema9_prev == null || ema21_prev == null) return null;

    if (ctx.position === 0) {
        // Golden cross: fast EMA crosses above slow EMA
        if (ema9_prev <= ema21_prev && ema9 > ema21) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Death cross: fast EMA crosses below slow EMA
        if (ema9_prev >= ema21_prev && ema9 < ema21) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
