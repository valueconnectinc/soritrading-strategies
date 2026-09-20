/*
 * @coinsori-strategy v1
 * name: ATR Ratio EMA Crossover — XRPUSDT 4H
 * ex: binance
 * syms: XRPUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ATR ratio (ATR14/ATR50) detects trending vs choppy
 * regimes. Previous ATR Ratio momentum (2105) used ATR ratio > 0.95 + dual
 * RSI+MACD confirmation — 0 trades fired (too strict). This version lowers
 * threshold to 0.70 and uses a single EMA(9/21) crossover confirmation,
 * which fires more reliably than dual-oscillator.
 *
 * When it buys and sells: In trending regime (ATR ratio > 0.70), buy when
 * EMA(9) crosses above EMA(21) AND RSI > 50. Sell when EMA(9) crosses below
 * EMA(21) AND RSI < 50. Exit on opposite crossover or ATR trailing stop.
 *
 * When it does NOT work: Fails in slow grinding XRP trends where EMA
 * crossover lags the move. Also fails when ATR ratio hovers 0.65-0.70
 * (no clear regime) — strategy sits out. Momentum lag vs mean-reversion
 * in fast XRP reversals.
 */
function onUpdate(ctx) {
    const atr14  = ctx.atr(14);
    const atr50  = ctx.atr(50);
    const rsi   = ctx.rsi(14);
    const price = ctx.price;

    if (atr14 == null || atr50 == null || rsi == null) return null;

    const pos = ctx.position;

    // ── Regime: ATR ratio > 0.70 = trending (lowered from 0.95) ────────────
    const atrRatio = atr14 / atr50;
    const isTrending = atrRatio > 0.70;

    // ── EMA crossover (9 vs 21) ─────────────────────────────────────────────
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const ema9_1  = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);

    if (ema9 == null || ema21 == null || ema9_1 == null || ema21_1 == null) return null;

    const bullishCross = ema9_1 <= ema21_1 && ema9 > ema21;
    const bearishCross = ema9_1 >= ema21_1 && ema9 < ema21;

    // ── Entry: Long ─────────────────────────────────────────────────────────
    if (pos === 0 && isTrending) {
        if (bullishCross && rsi > 50) {
            const riskCash = ctx.cash * 0.015;
            const stopDist = atr14 * 2.0;
            const qty      = riskCash / stopDist;
            return { side: 'buy', qty, type: 'limit', price: price * 0.998 };
        }
    }

    // ── Entry: Short ────────────────────────────────────────────────────────
    if (pos === 0 && isTrending) {
        if (bearishCross && rsi < 50) {
            const riskCash = ctx.cash * 0.015;
            const stopDist = atr14 * 2.0;
            const qty      = riskCash / stopDist;
            return { side: 'sell', qty, type: 'limit', price: price * 1.002 };
        }
    }

    // ── Exit: Long ─────────────────────────────────────────────────────────
    if (pos > 0) {
        // Exit on opposite crossover
        if (bearishCross) {
            return { side: 'sell', qty: pos };
        }
        // ATR trailing stop
        const prevClose = ctx.closes != null ? ctx.closes[ctx.closes.length - 2] : null;
        if (prevClose != null) {
            const stopPx = prevClose - 2.0 * atr14;
            if (price < stopPx) return { side: 'sell', qty: pos };
        }
    }

    // ── Exit: Short ────────────────────────────────────────────────────────
    if (pos < 0) {
        if (bullishCross) {
            return { side: 'buy', qty: Math.abs(pos) };
        }
        const prevClose = ctx.closes != null ? ctx.closes[ctx.closes.length - 2] : null;
        if (prevClose != null) {
            const stopPx = prevClose + 2.0 * atr14;
            if (price > stopPx) return { side: 'buy', qty: Math.abs(pos) };
        }
    }

    return null;
}
