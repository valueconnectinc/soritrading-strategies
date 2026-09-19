/*
 * @coinsori-strategy v1
 * name: BB RSI Volume Mean Reversion v3
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean reversion on 4H SOLUSDT. Buys when price formally closes at or below
 * the lower Bollinger Band with RSI oversold (<35) and above-average volume.
 * Sells when price reaches the middle band or RSI climbs above 60.
 * Works best in range-bound and choppy markets; loses badly in strong
 * sustained one-directional moves where RSI stays extreme.
 */
function onUpdate(ctx) {
    // Warm-up guard
    const rsi = ctx.rsi(14, 0);
    const rsi_1 = ctx.rsi(14, 1);
    const bb = ctx.bb(20, 2, 0);
    const bb_1 = ctx.bb(20, 2, 1);   // 1 bar ago = confirmed closed bar
    const avgVol = ctx.avgVol(20);

    if (rsi == null || rsi_1 == null || bb == null || bb_1 == null || avgVol == null || avgVol === 0) {
        return null;
    }

    const price = ctx.price;          // current (live) mid price
    const close1 = ctx.closes[1];     // closed close of bar 1 ago
    if (close1 == null) return null;

    // ENTRY CONDITIONS (all must be true)
    const volConfirm = ctx.vol > avgVol;                       // volume above 20-bar average
    const rsiOversold = rsi < 35 && rsi > rsi_1;              // RSI < 35 AND rising (confirming bounce)
    const atLowerBand = close1 <= bb_1.lower;                  // confirmed close at/below lower BB

    if (ctx.position === 0 && volConfirm && rsiOversold && atLowerBand) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // EXIT CONDITIONS (any one triggers)
    if (ctx.position > 0) {
        const mid = bb.mid;
        const rsiOverbought = rsi > 60;                         // RSI reached overbought territory

        // Exit 1: price reached middle BB
        if (price >= mid) {
            return { side: 'sell', qty: ctx.position };
        }

        // Exit 2: RSI overbought
        if (rsiOverbought) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
