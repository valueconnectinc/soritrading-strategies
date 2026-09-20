/*
 * @coinsori-strategy v1
 * name: Multi-Signal Ensemble Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Choppy altcoin markets generate false oversold signals when a single
 * indicator is used. Requiring three independent mean-reversion signals to align (RSI,
 * Stochastic, Bollinger Bands) dramatically reduces whipsaws while preserving the core
 * mean-reversion edge that has worked on AVAXUSDT 4h across multiple experiments.
 * When it buys and sells: Buys when RSI < 35, Stochastic %K < 20, AND price touches
 * the lower Bollinger Band simultaneously — all three must agree. Sells when any one
 * of RSI > 55, Stochastic %K > 80, or price reaches the middle BB triggers.
 * When it does NOT work: Strong trending markets (bull runs) — mean reversion signals
 * fire too early and repeatedly stop out before reversal. Sideways and bear markets
 * are the intended regime.
 */

function onUpdate(ctx) {
    // ago=1 reads the closed previous bar (safe in backtest and live)
    const rsi   = ctx.rsi(14, 1);
    const stoch = ctx.stoch(14, 3, 1);
    const bb    = ctx.bb(20, 2, 1);
    const atr   = ctx.atr(14, 1);

    // Warm-up guard
    if (rsi == null || stoch == null || bb == null || atr == null) return null;
    if (stoch.k == null) return null;

    const inPos    = ctx.position > 0;
    const hasEntry = ctx.openOrders().length === 0;

    // Entry: ALL three conditions must fire simultaneously
    // RSI oversold — price has fallen far enough to expect a bounce
    const rsiOversold   = rsi < 35;
    // Stochastic oversold — momentum at multi-session lows
    const stochOversold = stoch.k < 20;
    // Price at lower BB — statistically cheap relative to 20-bar channel
    const atLowerBB     = ctx.price <= bb.lower;

    if (!inPos && hasEntry && rsiOversold && stochOversold && atLowerBB) {
        // Stop-loss: 2.5× ATR below entry — room for mean reversion to develop
        const stopPx = ctx.price - 2.5 * atr;
        return {
            side: 'buy',
            qty: ctx.cash / ctx.price * 0.99,
            type: 'limit',
            price: ctx.price,
            postOnly: true,
            trigger: { side: 'sell', type: 'stop', price: stopPx }
        };
    }

    // Exit: ANY one condition closes the position
    const rsiOverbought   = rsi > 55;
    const stochOverbought = stoch.k > 80;
    const atMiddleBB      = ctx.price >= bb.mid;

    if (inPos && (rsiOverbought || stochOverbought || atMiddleBB)) {
        return { side: 'sell', qty: ctx.position };
    }

    // Hard stop: 2.5× ATR from entry price
    if (inPos && ctx.entryPx != null) {
        const stopPx = ctx.entryPx - 2.5 * atr;
        if (ctx.price <= stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
