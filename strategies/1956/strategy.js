/*
 * @coinsori-strategy v1
 * name: BB Squeeze Breakout + RSI Momentum (ETHUSDT 4H)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Bollinger Band squeeze signals low-volatility compression that
 * precedes explosive moves; RSI confirms momentum before entry, reducing false breakouts.
 * When it buys and sells: Buy when price breaks above the upper BB band AND RSI(14) > 55
 * (upward momentum confirmed). Sell when RSI drops below 45 or price closes below
 * the middle BB band.
 * When it does NOT work: Fails in choppy markets where BB bands expand horizontally
 * without directional trend — RSI oscillates without clean momentum.
 */

function onUpdate(ctx) {
    // Bollinger Bands: 20-period, 2 standard deviations
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;
    const upper = bb.upper;
    const mid   = bb.mid;
    const lower = bb.lower;

    // RSI for momentum confirmation
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // ATR for dynamic stop-loss distance
    const atr = ctx.atr(14);
    if (atr == null) return null;

    // Volume confirmation: current volume vs 20-bar average
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volRatio = ctx.vol / avgVol;

    // --- ENTRY: price breaks above upper BB with RSI confirming ---
    // RSI > 55 means the move has real momentum behind it
    // volRatio > 1.2 filters low-volume fake breakouts
    if (ctx.price > upper && rsi > 55 && volRatio > 1.2 && ctx.position === 0) {
        const stopPx = ctx.price - 1.5 * atr; // stop 1.5 ATR below entry
        return {
            side: 'buy',
            qty: ctx.cash / ctx.price * 0.97,
            type: 'smart',
            trigger: { side: 'sell', px: stopPx, type: 'stop' }
        };
    }

    // --- EXIT: RSI loses momentum or price falls below middle band ---
    // RSI < 45 = momentum has shifted bearish
    // Close below mid BB = trend deterioration
    const exitSignal = rsi < 45 || (ctx.position > 0 && ctx.price < mid);
    if (ctx.position > 0 && exitSignal) {
        return { side: 'sell', qty: ctx.position };
    }

    // --- TRAILING STOP: tighten stop as price moves up ---
    // Move stop to 1 ATR below highest price reached while in position
    if (ctx.position > 0) {
        const trailStop = ctx.price - 1.0 * atr;
        return {
            side: 'sell',
            qty: ctx.position,
            type: 'smart',
            trigger: { side: 'sell', px: trailStop, type: 'stop' }
        };
    }

    return null;
}
