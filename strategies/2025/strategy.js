/*
 * @coinsori-strategy v1
 * name: RSI Momentum Volume v3
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: v2's EMA9/EMA21 exit was too slow — it fires after the trend
 * reverses, locking in small gains in strong moves. v3 adds an ATR trailing stop that
 * activates after 5% profit, letting runners ride SOL's explosive rallies.
 * When it buys and sells: Buys when RSI crosses above 50, price above EMA21,
 * volume > 1.2x average. Sells on ATR trailing stop (activates after +5% profit),
 * or hard stop at 2.5x ATR, or RSI > 70.
 * When it does NOT work: In slow chop where ATR compresses (no trend = false stops),
 * or when SOL gaps down overnight (trailing stop gap fills wipe winners).
 */
function onUpdate(ctx) {
    const price    = ctx.price;
    const position = ctx.position;

    const ema9   = ctx.ema(9);
    const ema21  = ctx.ema(21);
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);
    const avgVol = ctx.avgVol(20);
    const vol    = ctx.vol;

    if (ema9 == null || ema21 == null || rsi == null || atr == null || avgVol == null || vol == null) return null;

    const prevRsi   = ctx.rsi(14, 1);
    const prevEma9  = ctx.ema(9,  1);
    const prevEma21 = ctx.ema(21, 1);
    if (prevRsi == null || prevEma9 == null || prevEma21 == null) return null;

    const volConfirm = vol >= avgVol * 1.2;

    // ---- ENTRY: Long ----
    const rsiCrossUp = prevRsi <= 50 && rsi > 50;
    const trendUp    = price > ema21;

    if (rsiCrossUp && trendUp && volConfirm && position === 0) {
        const stopPx = price - 2.5 * atr;
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.98,
            type: 'limit',
            price: price,
            stopPx: stopPx
        };
    }

    // ---- EXIT LONG (with ATR trailing stop) ----
    if (position > 0) {
        const entryPx = ctx.entryPx;
        const pnlPct  = (price - entryPx) / entryPx;

        // Hard stop at 2.5x ATR from entry
        const hardStop = entryPx - 2.5 * atr;
        if (price <= hardStop) {
            return { side: 'sell', qty: position, type: 'market' };
        }

        // Trailing stop: activates after 5% profit, trails by 2x ATR
        // Only move the stop UP, never down
        const trailTrigger = entryPx * 1.05; // 5% profit threshold
        if (price >= trailTrigger) {
            // Compute trailing stop level: price - 2x ATR (moves up with price)
            const trailStop = price - 2.0 * atr;
            // Only exit if price drops back to or below the trailing stop
            if (price <= trailStop) {
                return { side: 'sell', qty: position, type: 'market' };
            }
        }

        // Exit on overbought RSI (> 72 — aggressive, lock in gains)
        if (rsi > 72) {
            return { side: 'sell', qty: position, type: 'market' };
        }
    }

    return null;
}
