/*
 * @coinsori-strategy v1
 * name: Volume Spike + RSI Tight Stop v2
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same volume spike + RSI oversold idea as before, but with
 * tighter 3% stop and faster RSI-55 take-profit (instead of RSI-65). No trend
 * filter — the original caught good entries in windows 1 and 3 without one.
 * When it buys and sells: Buy when RSI < 32 AND volume > 1.8× avg. Sell when
 * RSI > 55 (fast take-profit) or price drops 3% below entry.
 * When it does NOT work: In strong downtrends RSI stays oversold for long periods
 * and entries get stopped out. Also fails when volume spikes are noise.
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
        if (rsi < 32 && volRatio > 1.8) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.99,
                type: 'limit',
                price: price
            };
        }
        // Opportunistic: very oversold without big volume spike
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
        // Take profit: RSI recovered to 55+
        if (rsi > 55) {
            return { side: 'sell', qty: ctx.position };
        }
        // Stop loss: 3% below entry
        const entryPx = ctx.entryPx;
        const loss = (entryPx - price) / entryPx;
        if (loss > 0.03) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
