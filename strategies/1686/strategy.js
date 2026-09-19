/*
 * @coinsori-strategy v1
 * name: ATR Trailing Stop Trend
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ATR-based trailing stops let winners run while cutting losses fast.
 * This is a pure trend-following strategy — enter on a confirmed uptrend (price above SMA 50)
 * and trail a stop locked at 2× ATR below the highest price since entry. No entry signals
 * trigger in choppy markets (price below SMA 50 = no trade).
 * When it buys and sells: Buy when price crosses above SMA 50 (confirming uptrend).
 * Trail stop starts at entry price minus 2× ATR, moving up only. Sell when price hits the stop.
 * When it does NOT work: Whipsaws badly in range-bound markets — every fakeout costs a trade.
 * Also fails in slow grind-downs where ATR widens and the stop gets hit before a real move starts.
 */

function onUpdate(ctx) {
    const sma = ctx.sma(50, 0);
    if (sma == null) return null;

    const atr = ctx.atr(14, 0);
    if (atr == null) return null;

    const price = ctx.price;
    const inUptrend = price > sma;

    // No position — look for entry
    if (ctx.position === 0) {
        if (inUptrend) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.99,
                type: 'limit',
                price: price
            };
        }
        return null;
    }

    // In position — trail stop
    if (ctx.position > 0) {
        const entryPx = ctx.entryPx;
        const stopPx = entryPx - 2 * atr;
        // Stop cannot move down once set (trailing only up)
        const trailPx = ctx.workOrders().length > 0
            ? ctx.workOrders()[0].price
            : stopPx;
        const newTrail = Math.max(trailPx, stopPx);

        if (price <= newTrail) {
            return { side: 'sell', qty: ctx.position };
        }

        // Update trailing stop order
        return {
            side: 'sell',
            qty: ctx.position,
            type: 'limit',
            price: newTrail,
            postOnly: true
        };
    }

    return null;
}
