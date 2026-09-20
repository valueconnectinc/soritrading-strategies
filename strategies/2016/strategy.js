/*
 * @coinsori-strategy v1
 * name: SOL Breakout Volume 4H
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: When price breaks above a 20-bar highest high on above-average volume,
 * it signals institutional or strong-market participation. This is a pure price-action breakout
 * without RSI or ATR filters that were too restrictive in testing.
 * When it buys and sells: Enter long when price closes above the 20-bar highest high
 * and volume exceeds 1.1x its 20-bar average. Exit when price falls below the 14-bar
 * lowest low.
 * When it does NOT work: In choppy markets with false breakouts. In strong downtrends
 * where even volume-confirmed breakouts fail.
 */

function onUpdate(ctx) {
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;

    // Read previous closed bar (ago=1 is safe in backtest and live)
    const prevHigh = ctx.high(20, 1);
    const prevLow  = ctx.low(14, 1);
    if (prevHigh == null || prevLow == null) return null;

    const hasPosition = ctx.position > 0;

    // Entry: price breaks above 20-bar high, volume confirm
    if (!hasPosition) {
        const priceBreakout = ctx.price > prevHigh;
        const volConfirm = ctx.vol > avgVol * 1.1;
        if (priceBreakout && volConfirm) {
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.95,
                type: 'market'
            };
        }
    }

    // Exit: price falls below 14-bar lowest low
    if (hasPosition && ctx.price < prevLow) {
        return {
            side: 'sell',
            qty: ctx.position,
            type: 'market'
        };
    }

    return null;
}
