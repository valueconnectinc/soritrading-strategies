/*
 * @coinsori-strategy v1
 * name: MACD EMA9 Crossover
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: MACD histogram turning positive is a faster trend confirmation
 * than a simple moving average cross. Combined with EMA 9 as a short-term filter,
 * this catches momentum shifts without the lag of longer-period signals.
 * When it buys and sells: Buy when MACD histogram crosses above 0 (MACD line crosses
 * signal line) AND price is above EMA 9. Sell when MACD histogram crosses below 0
 * or when price closes below EMA 9.
 * When it does NOT work: In choppy markets MACD flips constantly, generating
 * whipsaws. The strategy underperforms buy-and-hold during slow grinding rallies
 * where MACD never gives a clean entry.
 */

function onUpdate(ctx) {
    const ema9 = ctx.ema(9, 0);
    if (ema9 == null) return null;

    const macdNow = ctx.macd(12, 26, 9, 0);
    const macdPrev = ctx.macd(12, 26, 9, 1);
    if (macdNow == null || macdPrev == null) return null;
    if (macdNow.hist == null || macdPrev.hist == null) return null;

    const price = ctx.price;
    const inUptrend = price > ema9;

    // No position — look for buy signal
    if (ctx.position === 0) {
        const bullishCross = macdPrev.hist <= 0 && macdNow.hist > 0;
        if (bullishCross && inUptrend) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.99,
                type: 'limit',
                price: price
            };
        }
        // Also enter on MACD cross even if price just crossed above EMA (early entry)
        if (bullishCross) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.99,
                type: 'limit',
                price: price
            };
        }
        return null;
    }

    // In position — exit on MACD bearish cross or price below EMA 9
    if (ctx.position > 0) {
        const bearishCross = macdPrev.hist >= 0 && macdNow.hist < 0;
        if (bearishCross || price < ema9) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
