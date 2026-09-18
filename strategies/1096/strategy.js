/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion Daily v6
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * BB+RSI mean reversion with EMA20 trend filter — same family as v5
 * but uses a faster EMA (20 vs 50) to stay in the game longer during
 * recovery phases. v5's EMA50 was too slow, missing the Apr–Nov 2023
 * BTC recovery (+70% from $29k to $37k) while staying in cash.
 * When it buys: price crosses above lower BB band, RSI(7) < 35,
 * volume confirms, AND price is ABOVE EMA20 (short-term uptrend).
 * When it sells: price crosses below upper BB band OR RSI > 65 OR
 * price crosses below BB middle band.
 * When it does NOT work: EMA20 whipsaws in choppy markets, generating
 * false trend signals. Also still vulnerable to flash-crash events
 * where price pierces EMA20 momentarily (May 2021, Nov 2022).
 */

function onUpdate(ctx) {
    // ── Per-bar state ───────────────────────────────────────
    const state  = ctx.state ?? {};
    const curBar = ctx.i;
    if (state.lastBarI !== curBar) {
        state.prevRsi  = state.snapRsi  ?? null;
        state.snapRsi  = ctx.rsi(7);
        state.lastBarI = curBar;
        ctx.state      = state;
    }

    // ── Indicators ──────────────────────────────────────────
    const bb     = ctx.bb(20, 2);
    const rsi    = ctx.rsi(7);
    const vol    = ctx.vol;
    const avgVol = ctx.avgVol(20);
    const ema20  = ctx.ema(20);   // faster trend filter (vs EMA50 in v5)

    if (bb == null || rsi == null || avgVol == null || ema20 == null) return null;

    const { upper, mid, lower } = bb;
    const price    = ctx.price;
    const position = ctx.position;

    // ── Trend filter: only buy in short-term uptrends ───────
    const shortUptrend = price > ema20;

    // ── Entry signals ───────────────────────────────────────
    const prevClose     = ctx.closes?.[1];
    const crossUpLower  = prevClose != null && prevClose <= lower && price > lower;
    const rsiOversold   = rsi < 35;
    const volumeConfirm = vol > avgVol;

    if (crossUpLower && rsiOversold && volumeConfirm && shortUptrend && position === 0) {
        ctx.log(`BUY  crossUpLower  price=${price}  RSI=${rsi.toFixed(1)}  EMA20=${ema20.toFixed(0)}`);
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Exit signals ────────────────────────────────────────
    if (position > 0) {
        const crossDownUpper = prevClose != null && prevClose >= upper && price < upper;
        const rsiPrev    = state.prevRsi;
        const rsiCrossDn = rsiPrev != null && rsiPrev >= 65 && rsi < 65;
        const crossBelowMid = prevClose != null && prevClose >= mid && price < mid;

        if (crossDownUpper || rsiCrossDn || crossBelowMid) {
            const reason = crossDownUpper ? 'aboveUpperBand' : (rsiCrossDn ? 'rsiOverbought' : 'belowMidBand');
            ctx.log(`SELL ${reason}  price=${price}  RSI=${rsi.toFixed(1)}`);
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
