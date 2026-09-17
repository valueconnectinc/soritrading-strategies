/*
 * @coinsori-strategy v1
 * name: ATR Volatility Breakout 4H
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC's 4H chart often chops in tight ranges before explosive breakouts.
 * Volatility contraction precedes big moves — this strategy buys the breakout when both
 * price breaks above recent high AND volatility is historically compressed.
 * When it buys and sells: Buy when price closes above 20-bar high AND current ATR is below
 * its 50-bar SMA (compressed volatility). Sell on trailing ATR stop (2x ATR below high).
 * When it does NOT work: Fails in slow grinding trends where volatility never contracts
 * and price slowly grinds up/down without big candles — the breakout signal never fires.
 */
function onUpdate(ctx) {
    // Need enough bars for ATR(14), ATR SMA(50), and 20-bar high
    const atr = ctx.atr(14);
    if (atr == null) return null;

    // ATR 50-bar SMA to measure relative volatility
    const atrSm = ctx.sma(50);
    if (atrSm == null) return null;

    // Current ATR must be below its SMA — volatility compressed
    if (atr >= atrSm) return null;

    // Price must close above 20-bar high (breakout confirmation)
    const hi20 = ctx.high(20);
    if (hi20 == null) return null;

    if (ctx.price <= hi20) return null;

    // Open position: buy with trailing ATR stop
    if (ctx.position <= 0) {
        return {
            side: 'buy',
            qty: ctx.cash / ctx.price * 0.99,
            trigger: {
                side: 'sell',
                type: 'trail',
                trailPx: ctx.price - 2 * atr,  // 2x ATR trailing stop
                qty: 0  // close full position
            }
        };
    }

    // Already in position: update trailing stop
    // The trigger trailPx updates automatically if higher than current trail
    // We just need to ensure the stop is always 2x ATR below the high
    if (ctx.position > 0) {
        const trailPx = ctx.price - 2 * atr;
        return {
            side: 'sell',
            qty: ctx.position,
            type: 'trail',
            trailPx: trailPx,
            trigger: null
        };
    }

    return null;
}
