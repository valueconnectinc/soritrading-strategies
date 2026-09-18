/*
 * @coinsori-strategy v1
 * name: RSI Oversold + EMA200 Filter 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Simple mean-reversion: buy when RSI drops below 35 (oversold) in an uptrend.
 * Sell when RSI crosses above 60 or price falls below EMA200 (exit trend).
 * Works best in choppy/ranging markets; loses in strong sustained bear trends.
 */
function onUpdate(ctx) {
    // Warm-up guard — need at least 200 bars for EMA200
    if (ctx.i < 200) return null;

    // EMA200 trend filter — only buy when price is above EMA200 (confirmed uptrend)
    const ema200 = ctx.ema(200, 0);
    if (ema200 == null) return null;
    if (ctx.price < ema200) return null; // No buy in downtrend

    // RSI(14) — oversold threshold
    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;

    // Previous bar RSI for crossover detection
    const rsi1 = ctx.rsi(14, 1);
    if (rsi1 == null) return null;

    // Entry: RSI crosses below 30 (deep oversold) — mean-reversion buy
    // Using ago=1 vs ago=2 for closed-bar crossover detection
    const rsi2 = ctx.rsi(14, 2);
    if (rsi2 == null) return null;

    const noPosition = ctx.position === 0;

    // BUY: RSI[1] > 30 and RSI[0] < 30 (crossed into oversold) — mean-reversion signal
    if (noPosition && rsi1 > 30 && rsi < 30) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // SELL conditions when in position:
    if (!noPosition) {
        // Exit 1: RSI overbought — crosses above 70
        if (rsi1 < 70 && rsi > 70) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 2: RSI neutralized — crosses above 60 (partial profit taking)
        if (rsi1 < 60 && rsi > 60) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 3: Price drops below EMA200 — trend reversed, stop loss
        if (ctx.price < ema200) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
