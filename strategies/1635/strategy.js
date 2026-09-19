/*
 * @coinsori-strategy v1
 * name: EMA9/21 Crossover ATR Stop
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The previous version (1629) returned 0 trades because
 * the volume confirm filter (vol > avgVol on the signal bar) was too strict —
 * volume rarely spikes on the exact golden cross bar. This version removes
 * volume confirmation and adds an ATR-based stop instead, riding trends longer.
 * When it buys and sells: BUY when EMA9 crosses above EMA21 (golden cross).
 * SELL when price closes below EMA21 OR ATR stop is hit.
 * When it does NOT work: choppy markets where EMAs cross repeatedly (whipsaw),
 * or sudden gap-down events that skip past the ATR stop.
 */
function onUpdate(ctx) {
    // ── Warm-up: need EMA9, EMA21, ATR ─────────────────────────────────────
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const atr14 = ctx.atr(14);
    if (ema9 == null || ema21 == null || atr14 == null) return null;

    // ── EMA on previous closed bar (ago=1 = safe in all modes) ───────────────
    const ema9_1  = ctx.ema(9,  1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    // ── Golden cross: fast EMA crossed above slow EMA in the last bar ────────
    const goldenCross = ema9_1 <= ema21_1 && ema9 > ema21;

    // ── Death cross: fast EMA crossed below slow EMA ─────────────────────────
    const deathCross = ema9_1 >= ema21_1 && ema9 < ema21;

    const price = ctx.price;

    // ── Entry ─────────────────────────────────────────────────────────────────
    // Buy on golden cross. No volume filter (it caused 0 trades on SOLUSDT 4H).
    if (!ctx.position && goldenCross) {
        // ATR-based stop: 2× ATR below entry
        const stopPx = price - atr14 * 2;
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            stopPx: stopPx
        };
    }

    // ── Exit ───────────────────────────────────────────────────────────────────
    if (ctx.position > 0) {
        // Exit on death cross (trend reversal)
        if (deathCross) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit if price drops below EMA21 (trend broken)
        if (price < ema21) {
            return { side: 'sell', qty: ctx.position };
        }
        // ATR trailing stop: price falls more than 2× ATR below entry
        const entryPx = ctx.entryPx;
        const atrStop = entryPx - atr14 * 2;
        if (price < atrStop) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
