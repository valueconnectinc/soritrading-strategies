/*
 * @coinsori-strategy v1
 * name: EMA20 Trend Filter + RSI Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * EMA(20) as trend filter + RSI(14) mean reversion on pullbacks.
 * Why this strategy: In SOL's bull markets, price rarely drops below EMA20 —
 * when it does and RSI is oversold, it's a high-probability bounce setup.
 * When it buys and sells: Buy when price is above EMA20 (bull confirmed),
 * RSI crosses above 30 (leaving oversold), and volume is above average.
 * Sell when RSI crosses above 65 (overbought / momentum fading).
 * When it does NOT work: In sustained bear markets, price stays below EMA20
 * and every "bounce" fails. The EMA filter keeps you out but also means you
 * miss the recovery bottom. Works best in trending-bull + intermittent-crash regimes.
 */
function onUpdate(ctx) {
    const ema20 = ctx.ema(20);
    if (ema20 == null) return null;

    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const rsi_1 = ctx.rsi(14, 1);
    if (rsi_1 == null) return null;

    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volOk = ctx.vol > avgVol;

    // Trend: price above EMA20 = bull confirmed
    const bullTrend = ctx.price > ema20;

    // RSI leaves oversold zone (cross above 30) = pullback bounce signal
    const rsiBounce = rsi_1 <= 30 && rsi > 30;

    // RSI overbought (cross above 65) = exit signal
    const rsiExit = rsi_1 >= 65 && rsi > 65;

    if (ctx.position === 0) {
        // Only enter in bull trend, on RSI bounce, with volume
        if (bullTrend && rsiBounce && volOk) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        return null;
    }

    if (ctx.position > 0) {
        // Exit on RSI overbought
        if (rsiExit) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    return null;
}
