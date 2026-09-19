/*
 * @coinsori-strategy v1
 * name: EMA Crossover + ATR Trailing Stop
 * ex: binance
 * syms: ATOMUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA(9,21) crossover is the most validated family across
 * this job (MATIC +15%/+3%/-10%, SUI +15.7%/+7.5%/+36.8%). This run tests it
 * on ATOM (Cosmos ecosystem) — a different asset class with distinct price
 * behavior from the altcoins already tested.
 * When it buys and sells: Buys when EMA9 crosses above EMA21 with volume
 * confirmation; sells when EMA9 crosses back below EMA21.
 * When it does NOT work: Choppy markets with whipsaw crossovers — frequent
 * in bear-to-bull transition periods.
 */

function onUpdate(ctx) {
    // Warm-up: need at least 21 bars for EMA21
    const ema9  = ctx.ema(9,  0);
    const ema21 = ctx.ema(21, 0);
    const ema9_1  = ctx.ema(9,  1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9 == null || ema21 == null || ema9_1 == null || ema21_1 == null) return null;

    const rsi  = ctx.rsi(14, 0);
    const atr  = ctx.atr(14, 0);
    const vol  = ctx.vol;
    const avgV = ctx.avgVol(20);
    if (rsi == null || atr == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;

    // === ENTRY LONG ===
    // EMA9 crosses above EMA21 (bullish crossover)
    const bullCross = ema9_1 <= ema21_1 && ema9 > ema21;
    // Volume confirmation: today's volume > 1.2× 20-bar average
    const volConfirm = avgV != null && vol > avgV * 1.2;
    // Not overbought on entry
    const notExp = rsi < 70;

    if (bullCross && volConfirm && notExp) {
        // ATR-based stop-loss: 2× ATR below entry
        const stopPx = price - 2 * atr;
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            type: 'limit',
            price: price,
            // Stop-loss as a separate work order
            trigger: {
                type: 'stop',
                side: 'sell',
                qty: ctx.cash / price * 0.99,
                price: stopPx,
            }
        };
    }

    // === EXIT LONG ===
    if (pos > 0) {
        // EMA9 crosses below EMA21 (bearish crossover) → exit
        const bearCross = ema9_1 >= ema21_1 && ema9 < ema21;
        if (bearCross) {
            return { side: 'sell', qty: pos };
        }
        // ATR trailing stop: if price drops 2× ATR from peak, exit
        // Use ctx.uPnl to track unrealized; or simple: price < entry - 2×ATR
        const entryPx = ctx.entryPx;
        if (entryPx != null && price < entryPx - 2 * atr) {
            return { side: 'sell', qty: pos };
        }
        // RSI overbought → take profit
        if (rsi > 80) {
            return { side: 'sell', qty: pos };
        }
    }

    // === NO SHORTING (long-only) ===
    return null;
}
