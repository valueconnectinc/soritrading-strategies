/*
 * @coinsori-strategy v1
 * name: Volume-Confirmed BB Mean-Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC often bounces off Bollinger lower band during consolidation,
 * but low-volume piercings fake out and keep falling. By requiring volume confirmation,
 * we skip the traps and only enter when buyers actually show up.
 * When it buys and sells: Buy when price pierces below the lower BB (×0.995) AND volume
 * exceeds its 20-bar average by 20%+. Exit when price crosses the middle band. A simple
 * SMA50 > SMA200 filter keeps us out of downtrends.
 * When it does NOT work: In strong sustained downtrends where BB lower band keeps getting
 * dragged down — volume confirms the selling but the bounce never comes. Also fails in
 * low-volume illiquid periods where avgVol is unreliable.
 */
function onUpdate(ctx) {
    // Warm-up guards
    const sma50 = ctx.sma(50);
    const sma200 = ctx.sma(200);
    const bb = ctx.bb(20, 2);
    const rsi = ctx.rsi(14);
    const atr = ctx.atr(14);
    if (sma50 == null || sma200 == null || bb == null || rsi == null || atr == null) return null;
    if (bb.lower == null || bb.mid == null || bb.upper == null) return null;

    // Volume confirmation: current volume must exceed 20-bar average by 20%+
    const avgVol = ctx.avgVol(20);
    if (avgVol == null || avgVol === 0) return null;
    const volRatio = ctx.vol / avgVol;
    const hasVolume = volRatio >= 1.2;

    // Trend filter: only long when SMA50 is above SMA200 (bullish alignment)
    const bullTrend = sma50 > sma200;

    // RSI guard: avoid buying into already-oversold exhaustion
    const rsiOk = rsi > 20 && rsi < 65;

    // === ENTRY ===
    if (ctx.position === 0 && !ctx.openOrders().length) {
        // Price pierces below lower BB with volume confirmation
        const priceBelowLower = ctx.price < bb.lower * 0.995;
        if (priceBelowLower && hasVolume && bullTrend && rsiOk) {
            const stopPx = ctx.price - atr * 1.5;
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.99,
                type: 'limit',
                price: ctx.price,
                postOnly: false,
                trigger: { side: 'sell', type: 'stop', price: stopPx }
            };
        }
    }

    // === EXIT ===
    if (ctx.position > 0) {
        // Take profit: price crosses middle band from below
        const crossesMid = ctx.price >= bb.mid;
        // Time-based soft exit: hold for at least 8 bars, then exit on mid-band touch
        const heldLongEnough = ctx.i > 8;

        if (crossesMid && heldLongEnough) {
            return { side: 'sell', qty: ctx.position };
        }

        // Stop loss handled by trigger above
        // Secondary stop: if RSI climbs above 75 (overbought), exit early
        if (rsi > 75) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
