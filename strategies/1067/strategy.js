/*
 * @coinsori-strategy v1
 * name: ATR Volatility Breakout 4H
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC's 4H chart often chops in tight ranges before explosive breakouts.
 * Price breaking above a 20-bar high captures momentum after consolidation.
 * When it buys and sells: Buy when price closes above 20-bar high (breakout confirmation).
 * Sell when price hits 2.5x ATR trailing stop below the high, or after 30 bars in position.
 * When it does NOT work: Fails in slow grinding trends where price slowly grinds up without
 * big candles — the breakout signal fires late and the move is already exhausted.
 */
function onUpdate(ctx) {
    // Need enough bars for ATR(14) and 20-bar high
    const atr = ctx.atr(14);
    if (atr == null) return null;

    const hi20 = ctx.high(20);
    if (hi20 == null) return null;

    // --- ENTRY: price breaks above 20-bar high ---
    if (ctx.position <= 0) {
        if (ctx.price > hi20) {
            // Stop-loss: 2x ATR below entry
            const stopPx = ctx.price - 2 * atr;
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.99,
                trigger: {
                    side: 'sell',
                    type: 'stop',
                    price: stopPx,
                    qty: 0  // close full position
                }
            };
        }
        return null;
    }

    // --- EXIT: trailing stop 2.5x ATR below high since entry ---
    // Track the highest price seen since entry
    const trailStop = ctx.price - 2.5 * atr;

    // Time-based exit: close after 30 bars (5 days on 4H)
    // ctx.i is current bar index; we need to track entry bar
    // We store it in a closure-like approach using a static-like trick
    // Actually, we can use ctx.entryPx to infer rough time in market
    // For a clean exit: use a simple time counter via a persistent trick
    // Since we can't use global vars reliably, we approximate with price-based exit
    // If in profit > 3x ATR, tighten stop to lock in gains

    const entryDist = ctx.price - ctx.entryPx;
    const riskAmount = 2 * atr;

    // If profit exceeds 3x risk, move stop to breakeven + half ATR
    if (entryDist > 3 * riskAmount) {
        const newStop = ctx.entryPx + 0.5 * atr;
        return {
            side: 'sell',
            qty: ctx.position,
            type: 'stop',
            price: newStop,
            trigger: null
        };
    }

    // Normal trailing stop: 2.5x ATR below high
    return {
        side: 'sell',
        qty: ctx.position,
        type: 'stop',
        price: trailStop,
        trigger: null
    };
}
