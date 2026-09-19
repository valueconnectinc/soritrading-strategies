/*
 * @coinsori-strategy v1
 * name: Bollinger Squeeze v2 BTC
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Squeeze = Bollinger bandwidth below 50% of its 40-bar average.
 * This is a cleaner, simpler squeeze detection than the v1 which required Keltner.
 * BTC is chosen for liquidity and cleaner mean reversion behavior than alts.
 * When it buys and sells: Buy when squeeze fires (bandwidth < 50% avg) AND RSI < 32
 * (oversold bounce setup). Sell when RSI > 60 or stop at 4% loss.
 * When it does NOT work: In strong trends the squeeze fires at the WRONG time
 * (just before a deeper drop, not a bounce). Also fails when BTC grinds down
 * without a sharp reversal — RSI stays oversold and the entry gets stopped out.
 */
function onUpdate(ctx) {
    const bb = ctx.bb(20, 2, 0);
    if (bb == null) return null;

    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;

    // Compute bandwidth (upper - lower) for last 40 bars
    let bwSum = 0, bwCount = 0;
    const bwValues = [];
    for (let ago = 0; ago < 40; ago++) {
        const b = ctx.bb(20, 2, ago);
        if (b == null) break;
        const bw = b.upper - b.lower;
        bwValues.push(bw);
        bwSum += bw;
        bwCount++;
    }
    if (bwCount < 20) return null; // Need enough history

    const avgBw = bwSum / bwCount;
    const currentBw = bwValues[0];
    const squeezeRatio = currentBw / avgBw;
    const inSqueeze = squeezeRatio < 0.5;

    const price = ctx.price;

    // No position — look for entry
    if (ctx.position === 0) {
        // Primary: squeeze + oversold = bounce setup
        if (inSqueeze && rsi < 32) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.99,
                type: 'limit',
                price: price
            };
        }
        // Opportunistic: very oversold even without squeeze
        if (rsi < 28) {
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
        // Take profit: RSI recovered
        if (rsi > 60) {
            return { side: 'sell', qty: ctx.position };
        }
        // Stop loss: 4% below entry
        const entryPx = ctx.entryPx;
        const loss = (entryPx - price) / entryPx;
        if (loss > 0.04) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
