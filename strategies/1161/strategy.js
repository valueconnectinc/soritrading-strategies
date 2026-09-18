/*
 * @coinsori-strategy v1
 * name: EMA Crossover Trend — ETHUSDT 1d
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: ETH's 2024-2025 bull run had clean EMA20/50 golden/death crosses
 * on the daily chart — the strategy rides the full uptrend and exits cleanly on reversal.
 * When it buys and sells: Buys when EMA 20 crosses above EMA 50 (golden cross).
 * Sells when EMA 20 crosses below EMA 50 (death cross).
 * When it does NOT work: Whipsaws in choppy/ETF-announcement-driven ETH markets where
 * crosses happen frequently — 2022 bear had 3+ false crosses with large drawdowns.
 */
function onUpdate(ctx) {
    const ema20  = ctx.ema(20);
    const ema50  = ctx.ema(50);
    if (ema20 == null || ema50 == null) return null;

    const ema20_1 = ctx.ema(20, 1);
    const ema50_1 = ctx.ema(50, 1);
    if (ema20_1 == null || ema50_1 == null) return null;

    // ── Entry: EMA 20 crosses above EMA 50 (golden cross) ───────────────────
    if (ctx.position === 0 && ema20 > ema50 && ema20_1 <= ema50_1) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── Exit: EMA 20 crosses below EMA 50 (death cross) ──────────────────────
    if (ctx.position > 0 && ema20 < ema50 && ema20_1 >= ema50_1) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
