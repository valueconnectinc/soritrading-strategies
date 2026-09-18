/*
 * @coinsori-strategy v1
 * name: EMA Crossover Trend — BTCUSDT 1d
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC's strongest trend periods (2024-2025) are best captured
 * by a simple EMA 20/50 daily crossover — it stays long through the big moves
 * and exits when the trend reverses. No oscillator noise, no shorting.
 * When it buys and sells: Buys when EMA 20 crosses above EMA 50 (golden cross).
 * Sells when EMA 20 crosses below EMA 50 (death cross).
 * When it does NOT work: Whipsaws in choppy markets — BTC 2022 bear had 3
 * crossover signals with large drawdowns between them.
 */
function onUpdate(ctx) {
    const ema20 = ctx.ema(20);
    const ema50 = ctx.ema(50);
    if (ema20 == null || ema50 == null) return null;

    const price      = ctx.price;
    const aboveEMA50 = price > ema50;

    // ── Entry: EMA 20 crosses above EMA 50 (golden cross) ───────────────────
    // Need 2 bars to confirm crossover: ago=1 was below, ago=2 was below too
    // but current (ago=0) is above
    const ema20_1 = ctx.ema(20, 1);
    const ema50_1 = ctx.ema(50, 1);
    if (ema20_1 == null || ema50_1 == null) return null;

    if (ctx.position === 0 && ema20 > ema50 && ema20_1 <= ema50_1 && aboveEMA50) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Exit: EMA 20 crosses below EMA 50 (death cross) ──────────────────────
    if (ctx.position > 0) {
        if (ema20 < ema50 && ema20_1 >= ema50_1) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
