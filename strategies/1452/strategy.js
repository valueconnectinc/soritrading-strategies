/*
 * @coinsori-strategy v1
 * name: Supertrend RSI Hybrid v2
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Supertrend volatility-band system combined with RSI confirmation.
 * Uses EMA(20) ± 2.5×ATR(14) bands — trend flips when price crosses the opposite band.
 * Enters on Supertrend bullish flip (no RSI filter on entry — avoids missing moves).
 * Exits on Supertrend bearish flip OR RSI overbought (>65) OR ATR-based stop/target.
 * Works best in trending markets with clear directional moves.
 * Loses in choppy, range-bound markets with frequent band crossings.
 */

// Module-level state: previous trend (1 = bullish, -1 = bearish)
let prevTrend = 0;

function onUpdate(ctx) {
    const ema  = ctx.ema(20);
    const atr  = ctx.atr(14);
    const rsi  = ctx.rsi(14);
    if (ema == null || atr == null || rsi == null) return null;

    const price = ctx.price;

    // Upper and lower ATR bands around EMA
    const upperBand = ema + 2.5 * atr;
    const lowerBand = ema - 2.5 * atr;

    // Determine current trend direction
    let trend;
    if (prevTrend === 0) {
        trend = price >= upperBand ? 1 : -1;
    } else if (prevTrend === 1) {
        trend = price < lowerBand ? -1 : 1;
    } else {
        trend = price > upperBand ? 1 : -1;
    }

    // Current Supertrend value (the active band level)
    const supertrend = trend === 1 ? lowerBand : upperBand;

    // Detect flip this bar
    const bullFlip = prevTrend !== 0 && prevTrend === -1 && trend === 1;
    const bearFlip = prevTrend !== 0 && prevTrend === 1  && trend === -1;

    // Update trend for next bar
    prevTrend = trend;

    const position = ctx.position;

    // ── ENTRY: Supertrend flipped bullish — enter immediately ──
    // No RSI filter here: Supertrend flip IS the signal; RSI used only for exits
    if (position === 0 && bullFlip) {
        const stopPx = supertrend - 2.0 * atr;
        const riskAmt = ctx.cash * 0.02;
        const qty = riskAmt / (price - stopPx);
        if (qty > 0) return { side: 'buy', qty: qty * 0.99 };
    }

    // ── EXIT: Supertrend flipped bearish, RSI overbought, stop, or target ──
    if (position > 0) {
        const rsiOverbought = rsi > 65;
        const hardStop = supertrend - 2.0 * atr;
        const tpPx = supertrend + 5.0 * atr;

        if (bearFlip || rsiOverbought || price <= hardStop || price >= tpPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
