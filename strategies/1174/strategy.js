/*
 * @coinsori-strategy v1
 * name: SMA 20/60 Crossover Trend — BTCUSDT 1d
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Buys when the 20-bar SMA crosses above the 60-bar SMA (golden cross = uptrend).
 * Sells when the 20-bar SMA crosses back below (death cross = downtrend).
 * Pure trend-following MA — no indicators, no filters, no stops.
 * When it does NOT work: choppy markets where MAs weave in and out,
 * generating whipsaws; also lags badly at market tops and bottoms.
 */

function onUpdate(ctx) {
    const sma20 = ctx.sma(20);
    const sma60 = ctx.sma(60);
    if (sma20 == null || sma60 == null) return null;

    // Previous bar's SMAs for crossover detection
    const prevSma20 = ctx.sma(20, 1);
    const prevSma60 = ctx.sma(60, 1);
    if (prevSma20 == null || prevSma60 == null) return null;

    if (ctx.position === 0) {
        // Golden cross: short MA crosses above long MA
        if (prevSma20 <= prevSma60 && sma20 > sma60) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Death cross: short MA crosses below long MA
        if (prevSma20 >= prevSma60 && sma20 < sma60) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
