/*
 * @coinsori-strategy v1
 * name: EMA-9/21 Crossover with ATR Stop
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: The EMA-20 death cross (Exp 258) nearly matched buy-and-hold
 * but produced only 1 trade. This version uses faster EMAs (9/21) for more signals
 * while keeping the ATR-based stop to protect against drawdowns.
 * When it buys and sells: Buy when EMA-9 crosses above EMA-21 (golden cross).
 * Sell when EMA-9 crosses below EMA-21 (death cross) OR ATR stop is hit.
 * When it does NOT work: In choppy/sideways markets with frequent EMA crossovers,
 * the strategy whipsaws. Fast EMAs are more reactive but also more noisy.
 */
function onUpdate(ctx) {
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const atr   = ctx.atr(14);
    const vol20 = ctx.avgVol(20);
    const vol   = ctx.vol;

    if (ema9 == null || ema21 == null || atr == null || vol20 == null) return null;

    // ── Entry: EMA-9 crosses above EMA-21 (golden cross) ─────────
    // Compare 1 bar ago vs 2 bars ago for CLOSED bar crossover
    const ema9_1  = ctx.ema(9,  1);
    const ema21_1 = ctx.ema(21, 1);
    const ema9_2  = ctx.ema(9,  2);
    const ema21_2 = ctx.ema(21, 2);

    if (ema9_1 == null || ema21_1 == null || ema9_2 == null || ema21_2 == null) return null;

    const goldenCross = ema9_1 <= ema21_1 && ema9 > ema21;   // crossed up
    const deathCross   = ema9_1 >= ema21_1 && ema9 < ema21;   // crossed down
    const volConfirm   = vol > vol20 * 1.2;                   // volume 20% above avg

    const flat  = ctx.position === 0;
    const long  = ctx.position > 0;

    // ── Position sizing ─────────────────────────────────────────
    const riskPct  = 0.015;               // risk 1.5% of cash
    const stopDist = atr * 1.5;           // 1.5× ATR stop
    const qty      = (ctx.cash * riskPct) / stopDist;

    // ── Buy on golden cross + volume confirmation ─────────────────
    if (flat && goldenCross && volConfirm) {
        return {
            side:      'buy',
            qty:       qty,
            type:      'limit',
            price:     ctx.price * 0.999,
            postOnly:  true,
        };
    }

    // ── Sell on death cross OR ATR stop ─────────────────────────
    if (long) {
        const entryPx  = ctx.entryPx;
        const atrStop  = ctx.price - stopDist;
        const stopHit  = ctx.price < atrStop;
        const sellNow  = deathCross || stopHit;

        if (sellNow) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // ── Macro: skip buys when DXY > 106 (strong USD = bearish) ──
    const dxy = ctx.macro('dxy');
    if (dxy != null && dxy > 106 && flat && goldenCross) {
        ctx.log('DXY=' + dxy.toFixed(2) + ' > 106 — skipping entry');
    }

    return null;
}
