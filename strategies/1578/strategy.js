/*
 * @coinsori-strategy v1
 * name: BB-RSI Mean Reversion ATR Stop
 * ex: binance
 * syms: SUIUSDT
 * interval: 4h
 * cash: 1000
 *
 * BB-RSI mean reversion with ATR hard stop: the proven core (buy lower BB + RSI<35,
 * sell mid BB or RSI>65) plus a trailing ATR stop to cut losing trades faster.
 * When it buys: price touches/breaks below lower Bollinger Band AND RSI < 35.
 * When it sells: price reaches mid BB OR RSI > 65 OR ATR stop triggered.
 * When it does NOT work: strong directional trends — price grinds through lower BB
 * and the ATR stop catches the drawdown.
 */

function onUpdate(ctx) {
    const rsi = ctx.rsi(14);
    const atr = ctx.atr(14);
    const bb  = ctx.bb(20, 2);
    if (rsi == null || atr == null || bb == null) return null;

    const lower  = bb.lower;
    const mid    = bb.mid;
    const upper  = bb.upper;
    if (lower == null || mid == null || upper == null) return null;

    // ── Long entry ──────────────────────────────────────────
    if (ctx.position === 0) {
        // Price at/below lower BB AND RSI deeply oversold
        if (ctx.price <= lower && rsi < 35) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // ── Exit long ───────────────────────────────────────────
    if (ctx.position > 0) {
        // Sell at mid BB or RSI overbought
        if (ctx.price >= mid || rsi > 65) {
            return { side: 'sell', qty: ctx.position };
        }
        // ATR hard stop: exit if price drops 2× ATR below entry
        const stopPx = ctx.entryPx - 2 * atr;
        if (ctx.price < stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
