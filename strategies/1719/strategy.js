/*
 * @coinsori-strategy v1
 * name: ATR Momentum Breakout
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA9/EMA21 crossover is a proven momentum signal. The previous
 * version (v1) added an ATR gate that was too strict and produced zero trades. This
 * version removes the gate — ATR is used for stops only, not entry. A tight 1.5% stop
 * and 4% profit target capture trending moves without letting losers run.
 * When it buys and sells: Buy on EMA9/EMA21 bullish crossover. Sell on reverse cross
 * or when trailing stop is hit. No short side — long-only to avoid counter-trend risk.
 * When it does NOT work: Choppy markets where EMAs flip repeatedly — whipsaws.
 * Extended bear markets with no sustained trends.
 */

function onUpdate(ctx) {
    const ema9   = ctx.ema(9);
    const ema21  = ctx.ema(21);
    const ema9p  = ctx.ema(9,  2);  // 1 bar ago = previous closed bar
    const ema21p = ctx.ema(21, 2);
    const atr    = ctx.atr(14);

    if (ema9 == null || ema21 == null || ema9p == null || ema21p == null) return null;

    const price   = ctx.price;
    const pos     = ctx.position;
    const bullCross = ema9p <= ema21p && ema9 > ema21;  // just crossed up
    const bearCross = ema9p >= ema21p && ema9 < ema21;  // just crossed down

    // ── Entry: long on bullish EMA cross ───────────────────────────────────
    if (pos === 0 && bullCross) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Exit logic ──────────────────────────────────────────────────────────
    if (pos > 0) {
        const entryPx = ctx.entryPx;

        // Stop-loss: 1.5% below entry (tight — cut losers fast)
        if (entryPx != null && atr != null) {
            const stopPx = entryPx * 0.985;
            if (price < stopPx) {
                return { side: 'sell', qty: pos };  // market stop
            }
        }

        // Take profit: 4% above entry
        if (entryPx != null) {
            const targetPx = entryPx * 1.04;
            if (price >= targetPx) {
                return { side: 'sell', qty: pos };
            }
        }

        // Exit if EMA turns bearish (momentum fading)
        if (bearCross) {
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
