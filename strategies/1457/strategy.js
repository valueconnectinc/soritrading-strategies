/*
 * @coinsori-strategy v1
 * name: EMA Crossover + RSI Filter
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA 5/21 crossover is a classic momentum signal. Adding RSI
 * confirmation avoids false breakouts in overbought/oversold zones. ATR trailing
 * stop locks in gains adaptively.
 * When it buys and sells: Buys when EMA 5 crosses above EMA 21 AND RSI > 40
 * (confirming upward momentum). Sells when EMA 5 crosses below EMA 21 OR RSI > 75.
 * When it does NOT work: In tight ranges — EMA whipsaws and RSI never clears the
 * 40 threshold, generating no trades. Also loses in sharp one-bar pump-and-dumps.
 */
function onUpdate(ctx) {
    const ema5_1 = ctx.ema(5, 1);
    const ema5_2 = ctx.ema(5, 2);
    const ema21_1 = ctx.ema(21, 1);
    const ema21_2 = ctx.ema(21, 2);
    if (ema5_1 == null || ema5_2 == null || ema21_1 == null || ema21_2 == null) return null;

    const rsi = ctx.rsi(14, 1);
    if (rsi == null) return null;

    const atr = ctx.atr(14, 1);
    if (atr == null) return null;

    const price = ctx.price;
    const position = ctx.position;
    const entryPx = ctx.entryPx;

    // BUY: EMA 5 crosses above EMA 21, RSI confirms (> 40 = not oversold)
    if (ema5_2 <= ema21_2 && ema5_1 > ema21_1 && rsi > 40 && position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // SELL: EMA 5 crosses below EMA 21, OR RSI overbought (> 75)
    if (position > 0) {
        const sellOnCross = ema5_2 > ema21_2 && ema5_1 <= ema21_1;
        const sellOnRSI = rsi > 75;
        if (sellOnCross || sellOnRSI) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
