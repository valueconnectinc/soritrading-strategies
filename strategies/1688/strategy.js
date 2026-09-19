/*
 * @coinsori-strategy v1
 * name: Volume Spike + RSI
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Volume spikes often precede big moves. When price breaks out
 * with a volume surge AND RSI confirms momentum, the signal is more reliable than
 * price alone. This strategy buys the oversold bounce after a volume spike, betting
 * that institutional volume precedes a directional move.
 * When it buys and sells: Buy when RSI drops below 35 AND volume is 1.8× the 20-bar
 * average (volume spike). Sell when RSI climbs above 65 or price drops below entry - 4%.
 * When it does NOT work: In low-liquidity conditions volume spikes can be noise, not signal.
 * Also fails in slow grinding trends where volume is steady but RSI never gets extreme.
 */

function onUpdate(ctx) {
    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;

    const avgVol = ctx.avgVol(20);
    if (avgVol == null || avgVol === 0) return null;

    const volNow = ctx.vol;
    const volRatio = volNow / avgVol;

    const price = ctx.price;

    // No position — look for entry
    if (ctx.position === 0) {
        // Volume spike + RSI oversold = potential bounce setup
        if (rsi < 35 && volRatio > 1.8) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.99,
                type: 'limit',
                price: price
            };
        }
        // Also: RSI oversold alone if volume is decent (secondary entry)
        if (rsi < 30 && volRatio > 1.2) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.99,
                type: 'limit',
                price: price
            };
        }
        return null;
    }

    // In position — exit logic
    if (ctx.position > 0) {
        // Take profit: RSI overbought
        if (rsi > 65) {
            return { side: 'sell', qty: ctx.position };
        }
        // Stop loss: 4% below entry
        const entryPx = ctx.entryPx;
        const loss = (entryPx - price) / entryPx;
        if (loss > 0.04) {
            return { side: 'sell', qty: ctx.position };
        }
        // Trailing take profit: if RSI recovers to 50-55 range (momentum restored), take profit
        if (rsi > 50 && rsi < 65) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
