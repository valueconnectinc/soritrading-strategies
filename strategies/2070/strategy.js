/*
 * @coinsori-strategy v1
 * name: BB-RSI Mean Reversion on MATICUSDT
 * ex: binance
 * syms: MATICUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Bollinger Bands pin the normal trading range; when price
 * pierces the lower band, it tends to snap back toward the middle band — a
 * predictable mean-reversion pattern. RSI confirms the oversold condition so
 * we don't fade a genuine breakdown.
 * When it buys and sells: Buy when price closes below the lower BB AND RSI(14)
 * drops below 30 (confirmed oversold). Sell when price rallies back to or above
 * the middle BB band, or if RSI climbs above 70 (overbought exit).
 * When it does NOT work: In strong one-directional trends the band touch
 * triggers many losing entries — the strategy gets whipsawed and bleeds on
 * sustained momentum moves.
 */
function onUpdate(ctx) {
    // Warm-up guard: need at least 50 bars for BB(20)
    const i = ctx.i;
    if (i < 50) return null;

    // Bollinger Bands with standard 20-period, 2-sigma
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;
    const { upper, mid, lower } = bb;

    // RSI for oversold/overbought confirmation
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // Current price
    const price = ctx.price;

    // ---- ENTRY: price below lower BB AND RSI oversold ----
    // Lower band penetration = potential mean-reversion setup
    const belowLower = price < lower;
    const rsiOversold = rsi < 30;

    if (!ctx.position && belowLower && rsiOversold) {
        // Buy with 99% of available cash
        const qty = (ctx.cash * 0.99) / price;
        return { side: 'buy', qty };
    }

    // ---- EXIT: price back to middle band OR RSI overbought ----
    if (ctx.position > 0) {
        const atOrAboveMid = price >= mid;
        const rsiOverbought = rsi > 70;

        if (atOrAboveMid || rsiOverbought) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // No signal
    return null;
}
