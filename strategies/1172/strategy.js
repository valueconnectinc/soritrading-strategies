/*
 * @coinsori-strategy v1
 * name: EMA20 Trend Follow — BTCUSDT 1d
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Simplest possible trend-follow: price above EMA20 = stay long, price
 * crosses below EMA20 = exit. No RSI, no MACD, no fancy filters — just
 * the trend. Previous MACD/EMA200 combo lost -48% because EMA200 is too
 * slow (365-day lag) and MACD double-lags. EMA20 responds faster.
 *
 * When it buys:  price crosses above EMA20 (trend turns bullish).
 * When it sells: price crosses below EMA20 (trend turns bearish).
 *
 * When it does NOT work: in range-bound markets price oscillates around
 * EMA20 repeatedly — each touch triggers a round-trip that bleeds on fees.
 * EMA20 is the slowest single smoothing, so it still lags in fast moves.
 */

function onUpdate(ctx) {
    const ema20 = ctx.ema(20, 0);
    if (ema20 == null) return null;

    const closes1 = ctx.closes[1];
    if (closes1 == null) return null;

    // ── No position — look for entry ──────────────────────────────────────
    if (ctx.position === 0) {
        // Price crosses ABOVE EMA20
        const crossUp = closes1 <= ema20 && ctx.price > ema20;
        if (crossUp) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.995 };
        }
        return null;
    }

    // ── Active long — exit on trend reversal ──────────────────────────────
    if (ctx.position > 0) {
        // Price crosses BELOW EMA20
        const crossDown = closes1 >= ema20 && ctx.price < ema20;
        if (crossDown) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    return null;
}
