/*
 * @coinsori-strategy v1
 * name: FearGreed-Regime Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Fear & Greed index tends to stay elevated in bull markets
 * and depressed in bear markets. Using it as a regime filter — only taking
 * momentum trades when sentiment is bullish — avoids fighting sustained downtrends
 * that pure EMA systems chase into losses.
 *
 * When it buys and sells: Buys when EMA(9) crosses above EMA(21) AND price is
 * above SMA(50) AND RSI > 50, BUT only when Fear & Greed > 50 (bullish regime).
 * Exits on EMA death cross, ATR-based stop, or if Fear & Greed drops below 40
 * (regime shift to fear).
 *
 * When it does NOT work: In low-liquidity events (exchange outages, black-swan
 * news) F&G updates slowly and the filter gives false confidence. Also misses
 * early bull phases when F&G is still below 50 but price is already turning.
 */

function onUpdate(ctx) {
    const state = ctx.state;

    // Snapshot previous bar indicators on each new bar
    if (state.lastBarI !== ctx.i) {
        state.prevFast = state.fast;
        state.prevSlow = state.slow;
        state.prevRsi  = state.rsi;
        state.lastBarI = ctx.i;
    }

    // Current bar indicators
    state.fast = ctx.ema(9);
    state.slow = ctx.ema(21);
    state.rsi  = ctx.rsi(14);

    const fast     = state.fast;
    const slow     = state.slow;
    const prevFast = state.prevFast;
    const prevSlow = state.prevSlow;
    const rsi      = state.rsi;
    const prevRsi  = state.prevRsi;

    // Longer trend filter
    const sma50  = ctx.sma(50);
    const atr    = ctx.atr(14);

    // Fear & Greed regime filter — key differentiator from plain EMA systems
    const fg = ctx.data('fear_greed');

    // Guard: need all price indicators
    if (fast == null || slow == null || prevFast == null || prevSlow == null ||
        rsi == null || prevRsi == null || sma50 == null || atr == null ||
        ctx.i < 60) return null;

    // F&G returns null during warm-up of the external dataset — stay flat
    if (fg == null) return null;

    // ── Regime: F&G > 50 = bullish, F&G < 40 = bearish (exit / avoid) ──
    const bullRegime = fg > 50;
    const bearRegime = fg < 40;

    // ── Entry: EMA golden cross + trend + momentum (only in bull regime) ──
    const emaCrossUp   = prevFast <= prevSlow && fast > slow;
    const trendConfirm = ctx.price > sma50;
    const momentumOk    = rsi > 50;

    if (!ctx.position) {
        if (emaCrossUp && trendConfirm && momentumOk && bullRegime) {
            state.entryPx = ctx.price;
            const qty = (ctx.cash / ctx.price) * 0.95;
            return { side: 'buy', qty: qty };
        }
    } else {
        // ── Exit 1: EMA death cross ─────────────────────────────────────
        const emaCrossDown = prevFast >= prevSlow && fast < slow;
        if (emaCrossDown) {
            return { side: 'sell', qty: ctx.position };
        }

        // ── Exit 2: ATR stop-loss — 3× ATR below entry ─────────────────
        // Wider than the pure-EMA strategy (#1022) because F&G regime
        // shifts can cause gap moves; 3× gives room for normal volatility.
        const entryPx = state.entryPx || ctx.price;
        const stopPx  = entryPx - 3 * atr;
        if (ctx.price <= stopPx) {
            return { side: 'sell', qty: ctx.position };
        }

        // ── Exit 3: Regime shift to fear — F&G drops below 40 ─────────
        // If sentiment flips to fear while we hold, the bull thesis is broken.
        // Exit before the death cross catches it.
        if (bearRegime && prevRsi >= 40 && rsi < 40) {
            return { side: 'sell', qty: ctx.position };
        }

        // ── Exit 4: RSI weakness without full death cross ─────────────
        const rsiCrossDown = prevRsi >= 40 && rsi < 40;
        if (rsiCrossDown) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
