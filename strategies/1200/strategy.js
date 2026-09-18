/*
 * @coinsori-strategy v1
 * name: RSI Bollinger Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when RSI drops below 35 and price touches the lower Bollinger Band (oversold
 * mean-reversion setup). Sells when RSI rises above 60 or price reaches the middle
 * band (classic mean-reversion take-profit). Uses ATR-based stop loss.
 * When it does NOT work: choppy, range-bound markets where RSI oscillates without
 * a clean oversold bounce — the strategy whipsaws and fees erode the position.
 */
function onUpdate(ctx) {
    // Warm-up guards: need at least 50 bars for BB and RSI to be valid
    if (ctx.i < 50) return null;

    const rsi = ctx.rsi(14);
    const bb = ctx.bb(20, 2);
    const atr = ctx.atr(14);

    // All indicators must exist (warm-up guard)
    if (rsi == null || bb == null || atr == null) return null;
    if (bb.lower == null || bb.mid == null || bb.upper == null) return null;

    const price = ctx.price;
    const ema50 = ctx.ema(50);
    if (ema50 == null) return null;

    // --- ENTRY LOGIC: RSI oversold + price at/near lower BB ---
    // RSI < 35 = deeply oversold; price <= lower band = mean-reversion trigger
    // EMA50 rising = broad uptrend bias (reduces catching falling knives)
    const rsiOversold = rsi < 35;
    const atLowerBB = price <= bb.lower * 1.005; // 0.5% tolerance
    const emaRising = ctx.ema(50, 1) != null && ctx.ema(50, 1) < ema50;
    const noPosition = ctx.position === 0;

    if (noPosition && rsiOversold && atLowerBB && emaRising) {
        // ATR-based stop: 2x ATR below entry, capped at 8% of price
        const stopLoss = price - Math.min(atr * 2, price * 0.08);
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            stopLoss: stopLoss
        };
    }

    // --- EXIT LOGIC: position open ---
    if (ctx.position > 0) {
        const entryPrice = ctx.entryPx;

        // Take profit: RSI mean-reverted (crossed above 60) OR price reached middle BB
        const rsiReverted = rsi > 60;
        const atMidBB = price >= bb.mid * 0.998;
        const profitTarget = price >= entryPrice * 1.05; // 5% profit lock

        if (rsiReverted || atMidBB || profitTarget) {
            return { side: 'sell', qty: ctx.position };
        }

        // Stop loss: hard stop (ATR-based, set at order time; also check here)
        const stopPx = price - Math.min(atr * 2, price * 0.08);
        if (price <= stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
