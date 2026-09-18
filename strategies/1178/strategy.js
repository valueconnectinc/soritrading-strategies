/*
 * @coinsori-strategy v1
 * name: BB+RSI Mean Reversion — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when price touches the lower Bollinger Band AND RSI is below 35
 * (oversold confirmation — avoids catching falling knives). Sells when
 * price reaches the middle band (BB middle) or RSI climbs above 65
 * (momentum exhausted). This is a mean-reversion play: price tends to
 * bounce from the lower band back toward the mean.
 * When it does NOT work: strong trending drops where price hugs the lower
 * band for weeks (2022 crash style). RSI can stay oversold indefinitely
 * in a downtrend, so the entry requires BOTH conditions together.
 */

function onUpdate(ctx) {
    const bb    = ctx.bb(20, 2, 1);  // lower, mid, upper
    const rsi   = ctx.rsi(14, 1);
    if (bb == null || rsi == null) return null;
    const lower  = bb.lower;
    const middle = bb.mid;
    if (lower == null || middle == null) return null;

    if (ctx.position === 0) {
        // Entry: price at lower band + RSI confirming oversold
        if (ctx.price <= lower && rsi < 35) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Exit: price back to middle band OR RSI overbought
        if (ctx.price >= middle || rsi > 65) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
