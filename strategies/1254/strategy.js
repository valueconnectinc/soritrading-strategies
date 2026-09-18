/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Price at the lower Bollinger Band is a volatility-adjusted extreme —
 * it means price has deviated significantly from recent norm and tends to revert. Combined
 * with RSI < 35 confirmation, entries are selective and high-quality.
 * When it buys and sells: Buy when price pierces the lower BB band AND RSI < 35 (deep
 * pullback confirmed). Sell when price recovers above the middle BB band (SMA20), meaning
 * the reversion is complete.
 * When it does NOT work: In strong trends, price can ride the lower band for weeks — the
 * strategy accumulates small losses waiting for a reversal that never comes.
 */
function onUpdate(ctx) {
    const bb = ctx.bb(20, 2, 0);
    if (bb == null) return null;

    const lower  = bb.lower;
    const middle = bb.mid;
    if (lower == null || middle == null) return null;

    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;

    // === ENTRY: price at/below lower BB AND RSI confirms oversold ===
    if (pos === 0 && price <= lower && rsi < 35) {
        ctx.state.entryBar = ctx.i;   // track when we entered
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: price recovered above middle band — reversion complete ===
    if (pos > 0 && price > middle) {
        ctx.state.entryBar = undefined;
        return { side: 'sell', qty: pos };
    }

    // === TIME STOP: exit after 20 bars to avoid prolonged trends ===
    if (pos > 0 && ctx.state.entryBar !== undefined) {
        const held = ctx.i - ctx.state.entryBar;
        if (held >= 20) {
            ctx.state.entryBar = undefined;
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
