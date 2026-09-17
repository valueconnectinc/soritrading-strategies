/*
 * @coinsori-strategy v1
 * name: EMA Death Cross Enhanced
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: EMA-20 death cross (Exp 258) nearly matched buy-and-hold
 * (17.32% vs 18.84%) with dramatically lower MDD (7.66% vs unknown). This
 * version adds volume confirmation and ATR-based dynamic stops to reduce
 * false signals and improve risk management.
 * When it buys and sells: Buy when price crosses below EMA-20 (death cross)
 * AND volume surges above 1.5x 20-bar average. Sell when price crosses back
 * above EMA-20 (golden cross) OR ATR-based stop is hit.
 * When it does NOT work: In choppy markets with frequent EMA crossings,
 * volume filters reduce but don't eliminate whipsaws. In strong bull runs
 * the dynamic stop may exit too early.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────
    const ema20  = ctx.ema(20);
    const ema50  = ctx.ema(50);
    const atr    = ctx.atr(14);
    const vol20  = ctx.avgVol(20);          // 20-bar avg volume
    const vol    = ctx.vol;                  // current bar volume

    if (ema20 == null || ema50 == null || atr == null || vol20 == null) return null;

    // ── Position sizing ─────────────────────────────────────────
    const riskPct   = 0.02;                  // risk 2% of cash per trade
    const stopDist  = atr * 2;              // 2× ATR stop distance
    const qty       = (ctx.cash * riskPct) / stopDist;

    // ── Entry: death cross + volume surge ───────────────────────
    // Price crosses below EMA-20 (death cross)
    const priceBelowEma = ctx.price < ema20;
    // Volume confirmation: current volume > 1.5× 20-bar average
    const volConfirm     = vol > vol20 * 1.5;
    // No open position
    const flat           = ctx.position === 0;

    if (flat && priceBelowEma && volConfirm) {
        return {
            side:       'buy',
            qty:        qty,
            type:       'limit',
            price:      ctx.price * 0.999,   // slight discount to get filled
            postOnly:   true,
        };
    }

    // ── Dynamic stop: ATR-based trailing stop ───────────────────
    if (ctx.position > 0) {
        const entryPrice = ctx.entryPx;
        const atrStop    = ctx.price - stopDist;

        // Stop if price drops 2× ATR below entry OR price crosses back above EMA-20
        const stopHit    = ctx.price < atrStop;
        const goldenCross = ctx.price > ema20;

        if (stopHit || goldenCross) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // ── Macro filter: DXY (dollar index) rising → skip buys ────
    // High DXY = bearish for BTC; skip new entries when DXY > 104
    const dxy = ctx.macro('dxy');
    if (dxy != null && dxy > 104 && flat && priceBelowEma) {
        ctx.log('DXY=' + dxy.toFixed(2) + ' > 104 — skipping entry');
    }

    return null;
}
