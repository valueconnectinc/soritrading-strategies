/*
 * @coinsori-strategy v1
 * name: ATR Ratio Regime — XRPUSDT 4H
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ATR ratio (ATR14/ATR50) cleanly separates choppy from
 * trending markets — proven on AVAXUSDT and ETHUSDT (exp 507, 504, 489).
 * XRPUSDT is a completely different asset (banking/correlated to risk appetite)
 * that has NOT been tested. XRP's sharp pumps and dumps make ATR regime
 * detection especially valuable — it can distinguish XRP's blow-off tops from
 * genuine trends and avoid buying the dip during structural crashes.
 * When it buys and sells: In chop (ATR ratio < 0.65): buy RSI oversold near
 * BB lower band. In trend (ATR ratio > 0.95): follow EMA9/21 cross. Exit
 * on opposite signal or 2.5× ATR trailing stop.
 * When it does NOT work: In slow grinding XRP pumps where ATR never spikes
 * enough to trigger the trend regime — the strategy stays in chop mode and
 * misses the move. Also fails if XRP gaps down hard on negative news.
 */
function onUpdate(ctx) {
    const atr14  = ctx.atr(14);
    const atr50  = ctx.atr(50);
    if (atr14 == null || atr50 == null) return null;

    const atrRatio = atr14 / atr50;  // > 0.95 = trending, < 0.65 = chop

    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const rsi   = ctx.rsi(14);
    const bb    = ctx.bb(20, 2);
    const price = ctx.price;

    if (ema9 == null || ema21 == null || rsi == null || bb == null) return null;

    const ema9_1  = ctx.ema(9,  1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    const hasPos = ctx.position > 0;

    // ── ATR-based risk sizing: 1.5% risk per trade ──────────────────────────
    const riskCash = ctx.cash * 0.015;
    const stopDist = atr14 * 2.5;
    const qty      = riskCash / stopDist;

    // ── CHOP regime: mean reversion ─────────────────────────────────────────
    if (atrRatio < 0.65) {
        if (!hasPos) {
            // Long: RSI oversold + price near BB lower band
            if (rsi < 32 && price <= bb.lower * 1.02) {
                return { side: 'buy', qty: qty, type: 'limit', price: price * 0.998 };
            }
        }
        if (hasPos) {
            // Exit: RSI mean-reversion target
            if (rsi > 65) {
                return { side: 'sell', qty: ctx.position };
            }
            // ATR trailing stop (rises with price, never falls)
            const entryPx = ctx.entryPx;
            if (entryPx != null) {
                const prevClose = ctx.closes != null ? ctx.closes[ctx.closes.length - 2] : null;
                const highSince = Math.max(entryPx, prevClose != null ? prevClose : entryPx);
                const stopPx    = highSince - 2.5 * atr14;
                if (price < stopPx) return { side: 'sell', qty: ctx.position };
            }
        }
    }

    // ── TREND regime: momentum follow ────────────────────────────────────────
    else if (atrRatio > 0.95) {
        const crossUp   = ema9_1 <= ema21_1 && ema9 > ema21;
        const crossDown = ema9_1 >= ema21_1 && ema9 < ema21;

        if (!hasPos && crossUp) {
            return { side: 'buy', qty: qty, type: 'limit', price: price * 0.998 };
        }
        if (hasPos && (crossDown || rsi < 38)) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // ── MID regime: sit out (no clear signal) ────────────────────────────────
    // No entry, no exit — just hold if already in position

    return null;
}
