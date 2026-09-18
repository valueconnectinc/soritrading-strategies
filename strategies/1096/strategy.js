/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion Daily v4
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Improved BB+RSI mean reversion on daily BTCUSDT — building on the proven
 * family (strategy 1092: +117% return, 13.6% MDD on 730-bar window).
 * Changes from prior runs: RSI(7) instead of RSI(14) for more signals,
 * BB middle-band crossover as exit (not a fixed overbought level), and
 * volume confirmation to filter fakeouts in low-volume conditions.
 * When it buys: price crosses above lower BB band, RSI(7) < 35, and
 * volume exceeds its 20-bar average — all three must align.
 * When it sells: price crosses below upper BB band OR RSI(7) > 65 OR
 * price crosses below BB middle band (safety net).
 * When it does NOT work: strong trending bear markets where RSI stays
 * oversold for months (Mar 2014, Nov 2018, Nov 2022) — no trend filter
 * means the strategy keeps buying into a falling knife.
 */

function onUpdate(ctx) {
    // ── Per-bar state (avoid recalculating each tick) ──────
    const state  = ctx.state ?? {};
    const curBar = ctx.i;
    if (state.lastBarI !== curBar) {
        state.prevRsi    = state.snapRsi    ?? null;
        state.snapRsi    = ctx.rsi(7);
        state.lastBarI   = curBar;
        ctx.state        = state;
    }

    // ── Indicators ──────────────────────────────────────────
    const bb    = ctx.bb(20, 2);          // { upper, mid, lower }
    const rsi   = ctx.rsi(7);
    const vol   = ctx.vol;
    const avgVol = ctx.avgVol(20);

    if (bb == null || rsi == null || avgVol == null) return null;

    const { upper, mid, lower } = bb;
    const price   = ctx.price;
    const position = ctx.position;

    // ── Entry signals ───────────────────────────────────────
    // Price crosses above lower BB band (from below)
    const aboveLowerBand = price > lower;
    const rsiOversold    = rsi < 35;
    const volumeConfirm  = vol > avgVol;  // filter fakeouts in low-volume chop

    // Detect crossover: previous close was ≤ lower band, now above
    const prevClose = ctx.closes?.[1];
    const crossUpLower = prevClose != null && prevClose <= lower && price > lower;

    if (crossUpLower && rsiOversold && volumeConfirm && position === 0) {
        ctx.log(`BUY  crossUpLower=${crossUpLower}  price=${price}  RSI=${rsi.toFixed(1)}  vol=${vol.toFixed(0)} avgVol=${avgVol.toFixed(0)}`);
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Exit signals ────────────────────────────────────────
    if (position > 0) {
        // Price crosses below upper BB band
        const crossDownUpper = prevClose != null && prevClose >= upper && price < upper;

        // RSI exits (overbought)
        const rsiPrev = state.prevRsi;
        const rsiCrossDn = rsiPrev != null && rsiPrev >= 65 && rsi < 65;

        // Safety net: price drops below BB middle band
        const crossBelowMid = prevClose != null && prevClose >= mid && price < mid;

        if (crossDownUpper || rsiCrossDn || crossBelowMid) {
            const reason = crossDownUpper ? 'aboveUpperBand' : (rsiCrossDn ? 'rsiOverbought' : 'belowMidBand');
            ctx.log(`SELL ${reason}  price=${price}  RSI=${rsi.toFixed(1)}`);
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
