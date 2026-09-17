/*
 * @coinsori-strategy v1
 * name: BTC EMA Momentum ATR Stop
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossover captures medium-term trend shifts reliably
 * on BTC 4H. ATR-based stop-loss limits downside in fast drops. The fast EMA
 * filter avoids buying when the market is still in a downtrend.
 *
 * When it buys and sells: Buys when fast EMA(9) crosses above slow EMA(21),
 * price is above SMA50 for trend confirmation, and RSI > 50 for momentum.
 * Sells on EMA death cross OR when price hits the ATR stop-loss from entry.
 *
 * When it does NOT work: Sideways chop causes whipsaws (EMA crosses flip
 * frequently in low-volatility ranges). Also underperforms in long bear
 * trends where the bounce never sustains above SMA50.
 */

function onUpdate(ctx) {
    const state = ctx.state;

    // Snapshot previous bar values on each new bar
    if (state.lastBarI !== ctx.i) {
        state.prevFast = state.fast;
        state.prevSlow = state.slow;
        state.prevRsi  = state.rsi;
        state.lastBarI = ctx.i;
    }

    // Current indicators
    state.fast = ctx.ema(9);
    state.slow = ctx.ema(21);
    state.rsi  = ctx.rsi(14);

    const fast    = state.fast;
    const slow    = state.slow;
    const rsi     = state.rsi;
    const prevFast = state.prevFast;
    const prevSlow = state.prevSlow;
    const prevRsi  = state.prevRsi;

    // Longer filters
    const sma50 = ctx.sma(50);
    const atr   = ctx.atr(14);

    // Guard: need all values
    if (fast == null || slow == null || prevFast == null || prevSlow == null ||
        rsi == null || prevRsi == null || sma50 == null || atr == null) return null;
    if (ctx.i < 60) return null;  // warm-up

    // ── Entry: EMA golden cross + trend + momentum alignment ─────────
    // 1. Fast EMA crosses above slow EMA  →  trend shift to bullish
    const emaCrossUp   = prevFast <= prevSlow && fast > slow;
    // 2. Price above SMA50               →  in confirmed uptrend
    const trendConfirm = ctx.price > sma50;
    // 3. RSI > 50                        →  momentum is bullish
    const momentumOk    = rsi > 50;

    if (!ctx.position) {
        if (emaCrossUp && trendConfirm && momentumOk) {
            const qty = (ctx.cash / ctx.price) * 0.95;
            return { side: 'buy', qty: qty };
        }
    } else {
        // ── Exit 1: EMA death cross (slow crosses above fast) ───────
        const emaCrossDown = prevFast >= prevSlow && fast < slow;
        if (emaCrossDown) {
            return { side: 'sell', qty: ctx.position };
        }

        // ── Exit 2: ATR stop-loss — 2.5× ATR below entry price ──────
        // Protects capital in fast drops; 2.5× gives breathing room
        const stopPx = state.entryPx - 2.5 * atr;
        if (ctx.price <= stopPx) {
            return { side: 'sell', qty: ctx.position };
        }

        // ── Exit 3: RSI drops below 40 (momentum weakening) ─────────
        // Secondary safety net — exit before death cross in bad momentum
        const rsiCrossDown = prevRsi >= 40 && rsi < 40;
        if (rsiCrossDown) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
