/*
 * @coinsori-strategy v1
 * name: EMA + Volume Confirm 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossover alone underperforms because it fires on
 * weak momentum. Volume confirmation filters out low-conviction breakouts —
 * a real trend should have above-average volume behind it.
 * When it buys and sells: Buy when EMA-5 crosses above EMA-13 AND the
 * crossing candle has volume above the 20-bar average volume. Sell on reverse.
 * When it does NOT work: Volume spikes can lag price — by the time the
 * signal confirms, the move is already underway.
 */
function onUpdate(ctx) {
    const ema5  = ctx.ema(5);
    const ema13 = ctx.ema(13);
    if (ema5 == null || ema13 == null) return null;

    const ema5_1  = ctx.ema(5, 1);
    const ema13_1 = ctx.ema(13, 1);
    if (ema5_1 == null || ema13_1 == null) return null;

    // Volume confirmation: previous candle volume above its 20-bar average
    const avgVol = ctx.avgVol(20);
    const prevVol = ctx.vol; // vol is current bar volume; use volPrev for prev
    if (avgVol == null) return null;
    const prevVolVal = ctx.volPrev; // previous bar volume
    if (prevVolVal == null) return null;

    const volConfirm = prevVolVal >= avgVol;

    // ENTRY: EMA bullish cross + volume confirmation
    if (ctx.position === 0 && ema13_1 <= ema5_1 && ema5 > ema13 && volConfirm) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // EXIT: EMA bearish cross
    if (ctx.position > 0 && ema13_1 >= ema5_1 && ema13 < ema5) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
