/*
 * @coinsori-strategy v1
 * name: EMA-RSI Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * A clean trend-following strategy. Buys when price is above its 50-bar EMA
 * (established uptrend) AND RSI confirms momentum above 55 — no cross required,
 * so it enters on any bar that meets both conditions. Exits when price drops
 * below EMA50 or RSI falls below 42 (momentum loss). Includes a 4× ATR
 * profit target and a 24-bar (~4 day) time stop.
 *
 * Buys when: price > EMA(50) AND RSI(14) > 55.
 * Sells when: price < EMA(50), RSI < 42, profit target hit, or 24 bars elapsed.
 *
 * When it does NOT work: Sideways chop — price hovers around EMA50, triggering
 * repeated stop-outs. Also misses the start of trends if RSI is already > 55
 * before the strategy detects the uptrend.
 */
function onUpdate(ctx) {
    const ema50 = ctx.ema(50);
    if (ema50 == null) return null;

    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    const price = ctx.price;

    // ── ENTRY ────────────────────────────────────────────────────────────────
    if (ctx.position === 0) {
        // Trend established (price above EMA) + momentum confirming
        if (price > ema50 && rsi > 55) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.98,
                type: 'limit',
                price: price,
                postOnly: true,
            };
        }
    }

    // ── EXIT ─────────────────────────────────────────────────────────────────
    if (ctx.position > 0) {
        // Exit 1: trend breaks — price closes below EMA50
        if (price < ema50) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 2: momentum fades — RSI drops below 42
        if (rsi < 42) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 3: profit target — 4× ATR from entry
        const entryPx = ctx.entryPx;
        if (entryPx != null) {
            const profitTarget = entryPx + 4 * atr;
            if (price >= profitTarget) {
                return { side: 'sell', qty: ctx.position };
            }
        }
        // Exit 4: time stop — close after 24 bars (~4 days)
        if (ctx.i > 0 && ctx.i % 24 === 0) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
