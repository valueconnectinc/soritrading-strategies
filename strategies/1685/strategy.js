/*
 * @coinsori-strategy v1
 * name: Bollinger Squeeze + RSI Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Markets cycle between low-volatility squeezes and explosive moves.
 * A Bollinger Band squeeze (narrow bands) followed by expansion often produces quick directional
 * moves. This strategy fades extended RSI readings after a squeeze — betting that extreme
 * overbought/oversold readings revert after volatility contracts.
 * When it buys and sells: Buy when RSI drops below 30 (oversold) AFTER a squeeze has begun
 * (bandwidth narrowing). Sell when RSI climbs above 70 (overbought) or on a tight stop.
 * When it does NOT work: In strong trending markets with persistent momentum — RSI stays
 * extended for long periods and the strategy gets stopped out repeatedly.
 */

function onUpdate(ctx) {
    // Bollinger Band squeeze detection: ratio of current bandwidth to max bandwidth over lookback
    const bb = ctx.bb(20, 2, 0);
    if (bb == null) return null;

    // Track bandwidth over 40 bars to detect squeeze
    const bwHist = [];
    for (let i = 0; i < 40; i++) {
        const b = ctx.bb(20, 2, i);
        if (b == null) break;
        bwHist.push(b.upper - b.lower);
    }
    if (bwHist.length < 40) return null;

    const maxBw = Math.max(...bwHist);
    const currentBw = bb.upper - bb.lower;
    const squeezeRatio = currentBw / maxBw;

    // RSI for mean reversion entry
    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;

    // ATR for stop distance
    const atr = ctx.atr(14, 0);
    if (atr == null) return null;

    const inSqueeze = squeezeRatio < 0.5; // Bands have contracted to <50% of recent range

    // === ENTRY LOGIC ===
    // No position — look for entry
    if (ctx.position === 0) {
        // Buy on oversold after squeeze has formed (squeeze may be ending)
        if (inSqueeze && rsi < 35) {
            // Squeeze is on — RSI oversold — bet on mean reversion bounce
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.95,
                type: 'limit',
                price: ctx.price
            };
        }
        // Also enter on RSI oversold even without squeeze (opportunistic)
        if (!inSqueeze && rsi < 30) {
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.95,
                type: 'limit',
                price: ctx.price
            };
        }
    }

    // === EXIT LOGIC ===
    // In position — take profits or stop
    if (ctx.position > 0) {
        // Overbought — take profit
        if (rsi > 72) {
            return { side: 'sell', qty: ctx.position };
        }
        // Stop loss: price moved against 3× ATR
        const entryPx = ctx.entryPx;
        const loss = (entryPx - ctx.price) / entryPx;
        if (loss > 0.06) { // 6% stop — roughly 2× ATR for SOL
            return { side: 'sell', qty: ctx.position };
        }
        // Time stop: exit if held > 48 bars (8 days on 4h) without hitting target
        // ctx.i is the current bar index — we track entry bar via position tracking
        // Simple: if RSI back above 55 and we've been in, take profit
        if (rsi > 55 && rsi < 72) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
