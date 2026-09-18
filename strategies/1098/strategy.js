/*
 * @coinsori-strategy v1
 * name: EMA-9/21 Crossover BTC 4H v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossover is the most reliable trend-following signal —
 *   it fires consistently and is robust across market regimes.
 * When it buys and sells: Buy when EMA-9 crosses above EMA-21 (golden cross).
 *   Sell when EMA-9 crosses below EMA-21 (death cross). No extra filters to avoid
 *   missing trades on this fast timeframe.
 * When it does NOT work: Choppy markets — whipsaws in tight ranges. Best on
 *   strongly trending assets; BTC 4H has enough volatility for this to work.
 */
function onUpdate(ctx) {
    // Need at least 21 bars for the slow EMA
    const ema9 = ctx.ema(9);
    const ema21 = ctx.ema(21);
    if (ema9 == null || ema21 == null) return null;

    // Previous bar closed values (ago=1 is stable in backtest AND live)
    const ema9Prev  = ctx.ema(9, 1);
    const ema21Prev = ctx.ema(21, 1);
    if (ema9Prev == null || ema21Prev == null) return null;

    const pos = ctx.position;

    // ── BUY: EMA-9 crosses above EMA-21 ───────────────────────────────────
    if (pos === 0) {
        if (ema9Prev <= ema21Prev && ema9 > ema21) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // ── SELL: EMA-9 crosses below EMA-21 ─────────────────────────────────
    if (pos > 0) {
        if (ema9Prev >= ema21Prev && ema9 < ema21) {
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
