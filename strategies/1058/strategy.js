/*
 * @coinsori-strategy v1
 * name: EMA Crossover 1d
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * EMA (9/21) crossover on daily BTCUSDT. Buys when the 9-day EMA crosses
 * above the 21-day EMA (golden cross). Sells when the 9-day crosses below
 * the 21-day (death cross). Simple, high-probability trend-change signal.
 * When it does NOT work: choppy markets where EMAs cross back and forth
 * causing whipsaws. Also underperforms in slow grinding trends where a
 * simple moving average would stay above for months.
 */

function onUpdate(ctx) {
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const price = ctx.price;

    if (ema9 == null || ema21 == null || price == null) return null;

    const open    = ctx.openOrders();
    const hasBuy  = open.some(o => o.side === 'buy');
    const hasSell = open.some(o => o.side === 'sell');

    // === ENTRY: EMA 9 crosses ABOVE EMA 21 ===
    // Previous bar: ema9 <= ema21  →  Current bar: ema9 > ema21
    const ema9Prev  = ctx.ema(9,  1);
    const ema21Prev = ctx.ema(21, 1);
    if (ema9Prev == null || ema21Prev == null) return null;

    if (!hasBuy && !hasSell && ema9Prev <= ema21Prev && ema9 > ema21) {
        return { side: 'buy', qty: ctx.cash / price * 0.998 };
    }

    // === EXIT: EMA 9 crosses BELOW EMA 21 ===
    if (hasBuy && ema9Prev >= ema21Prev && ema9 < ema21) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
