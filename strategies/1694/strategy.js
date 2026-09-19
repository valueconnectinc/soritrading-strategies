/*
 * @coinsori-strategy v1
 * name: Volume Spike + RSI Wide TP
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Refines the Volume Spike + RSI idea (strategy 1688) with a
 * wider 5% stop and RSI-70 take-profit (vs RSI-65) to let winners run longer.
 * The original caught good entries but the tighter exit may have cut some winners
 * short. This version gives the trade more room.
 * When it buys and sells: Buy when RSI < 35 AND volume > 1.8× 20-bar average.
 * Sell when RSI > 70 (wider take-profit) or price drops 5% below entry.
 * When it does NOT work: In choppy markets the wider stop and exit allow
 * larger drawdowns. Also fails when volume spikes are false signals leading
 * to larger losses than the tighter version.
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
        // Primary: volume spike + RSI oversold
        if (rsi < 35 && volRatio > 1.8) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.99,
                type: 'limit',
                price: price
            };
        }
        // Opportunistic: very oversold even without big volume spike
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
        // Take profit: RSI overbought (wider threshold = let winners run)
        if (rsi > 70) {
            return { side: 'sell', qty: ctx.position };
        }
        // Stop loss: 5% below entry (wider stop = more room)
        const entryPx = ctx.entryPx;
        const loss = (entryPx - price) / entryPx;
        if (loss > 0.05) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
