/*
 * @coinsori-strategy v1
 * name: AVAX EMA Crossover with Volume
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Simple EMA9/21 crossover with volume confirmation on AVAXUSDT 4H.
 * Buys when EMA9 crosses above EMA21 on rising volume; sells on the reverse cross.
 * AVAX is a large-cap alt with cleaner trend structure than meme coins.
 */

function onUpdate(ctx) {
    const ema9 = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const prevEma9 = ctx.ema(9, 1);
    const prevEma21 = ctx.ema(21, 1);

    // Need both current and previous EMAs
    if (ema9 == null || ema21 == null || prevEma9 == null || prevEma21 == null) return null;

    const vol = ctx.vol;
    const avgVol = ctx.avgVol(20);
    // Volume confirmation: current volume above 20-bar average
    const volConfirm = avgVol != null && vol != null && vol > avgVol;

    // BUY: EMA9 crosses above EMA21 with volume
    if (prevEma9 <= prevEma21 && ema9 > ema21 && volConfirm) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // SELL: EMA9 crosses below EMA21 (no volume filter on exit)
    if (prevEma9 >= prevEma21 && ema9 < ema21) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
