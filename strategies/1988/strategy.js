/*
 * @coinsori-strategy v1
 * name: ETH 4h ATR Trailing Stop Trend
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * ETH 4h is a graveyard for most strategies. This uses EMA(50) as a trend filter
 * so we only trade with the trend, RSI(14) to confirm momentum direction,
 * and ATR(14) as a trailing stop. The key difference from failed breakout
 * strategies: we don't enter on a breakout — we enter when momentum confirms
 * an existing trend, and we use ATR to give the trade room before stopping out.
 * When it buys: price above EMA50 AND RSI crosses above 50 → buy.
 * When it sells: price crosses below EMA50 OR RSI crosses below 50 OR ATR trailing stop hit.
 * When it does NOT work: choppy range-bound markets where EMA and RSI flip
 * constantly, and in sharp one-directional drops where ATR stop is too wide.
 */

function onUpdate(ctx) {
    const ema50 = ctx.ema(50);
    const ema50_1 = ctx.ema(50, 1);
    const rsi = ctx.rsi(14);
    const rsi_1 = ctx.rsi(14, 1);
    const atr = ctx.atr(14);
    const price = ctx.price;

    if (ema50 == null || rsi == null || atr == null) return null;
    if (ema50_1 == null || rsi_1 == null) return null;

    // No position — look for entry
    if (ctx.position === 0) {
        // BUY: price above EMA50 (uptrend) AND RSI crosses above 50 (momentum confirming)
        const emaBull = price > ema50;
        const rsiCrossUp = rsi_1 <= 50 && rsi > 50;
        if (emaBull && rsiCrossUp) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
        // SELL: price below EMA50 (downtrend) AND RSI crosses below 50
        const emaBear = price < ema50;
        const rsiCrossDn = rsi_1 >= 50 && rsi < 50;
        if (emaBear && rsiCrossDn) {
            return { side: 'sell', qty: ctx.cash / price * 0.99 };
        }
        return null;
    }

    // Have a long position
    if (ctx.position > 0) {
        // Exit 1: price crosses below EMA50
        if (price < ema50) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 2: RSI crosses below 50 (momentum dying)
        const rsiCrossDn = rsi_1 >= 50 && rsi < 50;
        if (rsiCrossDn) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 3: ATR trailing stop — stop is price - 2 * ATR
        const atrStop = price - 2 * atr;
        if (ctx.entryPx > 0 && atrStop > ctx.entryPx) {
            // Only use if stop moved up (trailing)
            if (atrStop < ctx.price * 0.95) { // don't exit immediately at entry
                // Use the better of EMA exit or ATR stop
                return { side: 'sell', qty: ctx.position };
            }
        }
        return null;
    }

    // Have a short position
    if (ctx.position < 0) {
        // Exit 1: price crosses above EMA50
        if (price > ema50) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        // Exit 2: RSI crosses above 50
        const rsiCrossUp = rsi_1 <= 50 && rsi > 50;
        if (rsiCrossUp) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        // Exit 3: ATR trailing stop for shorts — stop is price + 2 * ATR
        const atrStop = price + 2 * atr;
        if (ctx.entryPx > 0 && atrStop < ctx.entryPx) {
            if (atrStop > ctx.price * 1.05) {
                return { side: 'buy', qty: Math.abs(ctx.position) };
            }
        }
        return null;
    }

    return null;
}
