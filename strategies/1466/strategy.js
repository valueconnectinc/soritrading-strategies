/*
 * @coinsori-strategy v1
 * name: Donchian Momentum Breakout v2
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Donchian Channel breakout with RSI momentum confirmation.
 * Enters when price breaks above the previous 20-bar high AND RSI > 55.
 * Exits when price breaks below the previous 20-bar low OR RSI < 45.
 * Only enters if price is above the 200 EMA (avoids downtrends).
 * Works best in trending markets with sustained directional moves.
 * Loses in choppy, range-bound markets where breakouts repeatedly fail.
 */

function onUpdate(ctx) {
    const price    = ctx.price;
    const rsi      = ctx.rsi(14);
    const ema200   = ctx.ema(200);

    // Previous 20-bar high: highest high from 2 to 21 bars ago (closed bars only)
    const prevHigh20 = ctx.high(21, 2);
    // Previous 20-bar low: lowest low from 2 to 21 bars ago
    const prevLow20  = ctx.low(21, 2);

    // Current 20-bar high (includes current forming bar)
    const curHigh20 = ctx.high(20);
    // Current 20-bar low
    const curLow20  = ctx.low(20);

    if (prevHigh20 == null || prevLow20 == null || curHigh20 == null || curLow20 == null || rsi == null || ema200 == null) return null;

    const position = ctx.position;

    // ── ENTRY: price breaks above previous 20-bar high, RSI confirms, above EMA ──
    if (position === 0 && price > prevHigh20 && rsi > 55 && price > ema200) {
        const stopPx = price * 0.96;   // 4% hard stop
        const riskAmt = ctx.cash * 0.02;
        const qty = riskAmt / (price - stopPx);
        if (qty > 0) return { side: 'buy', qty: qty * 0.99 };
    }

    // ── EXIT: price breaks below previous 20-bar low OR RSI weakens ──
    if (position > 0) {
        const priceBrokenLow = price < prevLow20;
        const rsiWeak        = rsi < 45;
        if (priceBrokenLow || rsiWeak) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
