/*
 * @coinsori-strategy v1
 * name: RSI-2 Bare Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * DIAGNOSTIC: bare RSI(2) mean reversion with NO filters.
 * Entry: RSI(2) < 20 (pure oversold). Exit: RSI(2) > 50 or 10-bar timeout.
 * No EMA200, no BB, no ATR — just the raw RSI signal.
 * Tests whether the filters in the original strategy are blocking signals.
 *
 * When it buys and sells: Buy at RSI(2) < 20; sell at RSI(2) > 50 or 10 days.
 *
 * When it does NOT work: In strong uptrends where RSI rarely drops below 20.
 */
function onUpdate(ctx) {
    const rsi2 = ctx.rsi(2);
    if (rsi2 == null) return null;

    const price = ctx.price;
    const inPos = ctx.position > 0;
    const noPos = ctx.position <= 0;

    // BUY: RSI(2) < 20 (no other filter)
    if (noPos && rsi2 < 20) {
        const s = ctx.state;
        s.barsHeld = 0;
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            type: 'limit',
            price: price
        };
    }

    // SELL: RSI(2) > 50 (mean reverted, not overbought — softer than 70)
    if (inPos && rsi2 > 50) {
        const s = ctx.state;
        s.barsHeld = 0;
        return { side: 'sell', qty: ctx.position };
    }

    // TIME STOP: 10-bar max hold
    if (inPos) {
        const s = ctx.state;
        s.barsHeld = (s.barsHeld || 0) + 1;
        if (s.barsHeld > 10) {
            s.barsHeld = 0;
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
