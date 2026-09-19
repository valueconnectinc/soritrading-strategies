/*
 * @coinsori-strategy v1
 * name: RSI Oversold Volume Surge
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: DOGE swings hard — RSI<30 marks panic bottoms where volume typically spikes
 * as sellers exhaust themselves. Buying the oversold dip with volume confirmation catches the snap-back.
 * When it buys and sells: Buys when RSI drops below 30 AND volume is above the 20-bar average
 * (panic selling confirmation). Sells when RSI recovers above 60 (overbought snap-back complete).
 * When it does NOT work: In strong downtrends RSI stays oversold for extended periods — the
 * snap-back never comes or is weak. Also fails if volume surge is driven by a final capitulation
 * that precedes even lower prices.
 */
function onUpdate(ctx) {
    const rsi1 = ctx.rsi(14, 1);
    const rsi2 = ctx.rsi(14, 2);
    if (rsi1 == null || rsi2 == null) return null;

    const vol = ctx.vol;
    const avgVol = ctx.avgVol(20);
    if (vol == null || avgVol == null) return null;

    // Volume surge: current volume at least 1.5× the 20-bar average
    const volSurge = vol >= avgVol * 1.5;

    // BUY: RSI crosses below 30 (oversold) with volume surge — panic bottom
    const rsiCrossDown = rsi2 >= 30 && rsi1 < 30;

    if (rsiCrossDown && volSurge && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // SELL: RSI recovers above 60 — overbought snap-back complete
    const rsiCrossUp = rsi2 <= 60 && rsi1 > 60;

    if (rsiCrossUp && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
