/*
 * @coinsori-strategy v1
 * name: Pure EMA Crossover Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The simplest possible momentum strategy — EMA(9/21)
 * crossover with a trend filter. No Fear & Greed, no BBW, no volume.
 * This is the baseline to beat; everything added on top must justify
 * its complexity with better returns or lower drawdown.
 *
 * When it buys and sells: Buys on EMA(9) cross above EMA(21) when
 * price is above SMA(50). Sells on death cross or 3× ATR stop.
 *
 * When it does NOT work: In choppy markets EMA flips repeatedly,
 * causing whipsaw losses. No filter means no protection against
 * regime changes.
 */

function onUpdate(ctx) {
    const state = ctx.state;

    if (state.lastBarI !== ctx.i) {
        state.prevFast = state.fast;
        state.prevSlow = state.slow;
        state.lastBarI = ctx.i;
    }

    state.fast = ctx.ema(9);
    state.slow = ctx.ema(21);

    const fast     = state.fast;
    const slow     = state.slow;
    const prevFast = state.prevFast;
    const prevSlow = state.prevSlow;

    const sma50 = ctx.sma(50);
    const atr   = ctx.atr(14);

    if (fast == null || slow == null || prevFast == null || prevSlow == null ||
        sma50 == null || atr == null || ctx.i < 60) return null;

    if (!ctx.position) {
        // ── Entry: EMA golden cross + price above SMA(50) ────────────
        const emaCrossUp   = prevFast <= prevSlow && fast > slow;
        const trendConfirm = ctx.price > sma50;
        if (emaCrossUp && trendConfirm) {
            state.entryPx = ctx.price;
            const qty = (ctx.cash / ctx.price) * 0.95;
            return { side: 'buy', qty: qty };
        }
    } else {
        // ── Exit 1: EMA death cross ──────────────────────────────────
        const emaCrossDown = prevFast >= prevSlow && fast < slow;
        if (emaCrossDown) return { side: 'sell', qty: ctx.position };

        // ── Exit 2: 3× ATR stop ─────────────────────────────────────
        const entryPx = state.entryPx || ctx.price;
        const stopPx  = entryPx - 3 * atr;
        if (ctx.price <= stopPx) return { side: 'sell', qty: ctx.position };
    }

    return null;
}
