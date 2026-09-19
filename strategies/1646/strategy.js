/*
 * @coinsori-strategy v1
 * name: ATR Regime-Adaptive Hybrid
 * ex: binance
 * syms: ETHUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * ATR percentile switches the strategy between two regimes:
 * Low-vol (ATR percentile < 40): BB mean-reversion — buy when price touches
 *   the lower band, sell when it returns to the middle band. Works in calm,
 *   range-bound markets.
 * High-vol (ATR percentile > 60): EMA momentum — buy when EMA9 crosses above
 *   EMA21 in an uptrend, sell on the reverse cross. Works when volatility
 *   signals a trending market.
 * When it buys and sells: Long only. No shorting (crypto 4h trends up over
 *   time; shorting into uptrends destroys returns).
 * When it does NOT work: In extended bear markets (like late 2022) both
 *   regimes lose. EMA momentum fails when ETH choppily grinds down without
 *   clean crossovers. The ATR regime signal may lag real market transitions.
 */
function onUpdate(ctx) {
    // ── WARM-UP ────────────────────────────────────────────────────────────
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const bb    = ctx.bb(20, 2);
    const atr   = ctx.atr(14);
    const atr1  = ctx.atr(14, 1);  // previous bar ATR
    if (ema9 == null || ema21 == null || bb == null || atr == null || atr1 == null) return null;

    // ── REGIME DETECTION: ATR percentile ───────────────────────────────────
    // Collect last 20 ATR values to estimate percentile rank
    const atrHistory = [];
    for (let i = 0; i < 20; i++) {
        const v = ctx.atr(14, i);
        if (v == null) break;
        atrHistory.push(v);
    }
    if (atrHistory.length < 10) return null;  // need enough history

    const sorted   = atrHistory.slice().sort((a, b) => a - b);
    const pctRank  = sorted.filter(v => v <= atr).length / sorted.length;

    // ── REGIME PARAMETERS ─────────────────────────────────────────────────
    const LOW_VOL  = pctRank < 0.40;   // calm — use mean reversion
    const HIGH_VOL = pctRank > 0.60;   // trending — use momentum
    const MIDDLE   = bb.mid;
    const LOWER    = bb.lower;
    const UPPER    = bb.upper;
    const price    = ctx.price;

    // ── POSITION SIZING ───────────────────────────────────────────────────
    const qty = ctx.cash / price * 0.98;  // near-full Kelly, long only

    // ── ENTRY LOGIC ────────────────────────────────────────────────────────
    // Regime 1: Mean reversion (low volatility)
    // Buy when price touches or pierces the BB lower band
    if (LOW_VOL) {
        // No position → look for entry
        if (ctx.position === 0) {
            // Entry: price at or below lower band (with 0.5% buffer for piercings)
            if (price <= LOWER * 1.005) {
                return { side: 'buy', qty: qty };
            }
        }
        // Have position → exit when price returns to middle band
        else if (ctx.position > 0) {
            if (price >= MIDDLE * 0.995) {
                return { side: 'sell', qty: ctx.position };
            }
        }
    }

    // Regime 2: EMA momentum (high volatility)
    // Buy when EMA9 crosses above EMA21 with price above EMA21
    if (HIGH_VOL) {
        const ema9_1  = ctx.ema(9,  1);
        const ema21_1 = ctx.ema(21, 1);
        if (ema9_1 == null || ema21_1 == null) return null;

        // Entry: EMA9 crosses above EMA21, price above EMA21 (uptrend confirmed)
        if (ctx.position === 0) {
            if (ema9_1 <= ema21_1 && ema9 > ema21 && price > ema21) {
                return { side: 'buy', qty: qty };
            }
        }
        // Exit: EMA9 crosses below EMA21
        else if (ctx.position > 0) {
            if (ema9_1 >= ema21_1 && ema9 < ema21) {
                return { side: 'sell', qty: ctx.position };
            }
        }
    }

    // ── STOP-LOSS (applied in both regimes) ───────────────────────────────
    // Hard stop: 3× ATR below entry — only if we have a position
    if (ctx.position > 0 && ctx.entryPx != null) {
        const stopPx = ctx.entryPx - 3 * atr;
        if (price < stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
