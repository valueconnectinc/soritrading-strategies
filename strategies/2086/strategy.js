/*
 * @coinsori-strategy v1
 * name: ATR-Regime BB RSI Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion (BB+RSI) works in ranging markets but whipsaws
 * in choppy sideways action. The ATR ratio (ATR14/ATR50) cleanly separates choppy
 * (<0.65) from trending (>0.95) — skipping choppy windows avoids false signals.
 * SOLUSDT's high volatility rewards both the volatility filter and the reversal plays.
 * When it buys and sells: BUY when ATR ratio > 0.65 (not choppy) AND price < lower
 * BB(20,2) AND RSI(14) < 35. SELL when RSI > 65 OR price > middle BB.
 * When it does NOT work: Strong sustained trends — the ATR filter keeps us out of
 * trending markets, so we miss both the fall and the recovery. Low-vol ranging
 * where RSI never reaches oversold.
 */
function onUpdate(ctx) {
    // Warm-up: ATR50 needs ~50 bars, BB(20) needs 20 bars, RSI(14) needs 14 bars
    if (ctx.i < 50) return null;

    // === ATR regime filter: separates choppy from trending ===
    const atr14 = ctx.atr(14);
    const atr50 = ctx.atr(50);
    if (atr14 == null || atr50 == null || atr50 === 0) return null;

    const atrRatio = atr14 / atr50;
    // Skip entries when market is choppy (ratio < 0.65); allow in trending or transitioning
    const notChoppy = atrRatio > 0.65;

    // === Mean reversion signals ===
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const bb = ctx.bb(20, 2);
    if (bb == null || bb.lower == null || bb.mid == null) return null;

    const priceBelowLower = ctx.price < bb.lower;
    const priceAboveMid = ctx.price > bb.mid;

    // === Entry: not choppy + oversold + below lower BB ===
    if (priceBelowLower && rsi < 35 && notChoppy && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // === Exit: RSI normalization OR price reclaimed middle band ===
    if (ctx.position > 0) {
        if (rsi > 65 || priceAboveMid) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
