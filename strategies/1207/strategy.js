/*
 * @coinsori-strategy v1
 * name: Dual Oscillator with ATR Stop & Partial TP
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: RSI + Stochastic oversold mean reversion with an ATR-based
 * stop-loss to cap per-trade loss. Partial profit-taking at RSI 60 locks gains
 * before a full reversal. NO trend filter — oversold is oversold regardless of trend.
 * When it buys and sells: Buy when RSI < 35 AND Stochastic %K < 30.
 * Sell 50% when RSI crosses 60; sell remaining when RSI crosses 70 OR ATR stop.
 * When it does NOT work: Strong trending moves where oscillators stay oversold
 * for extended periods — the stop-loss may trigger repeatedly in a choppy bear trend.
 */

function onUpdate(ctx) {
    // Warmup: Stoch(14,3) needs ~17 bars, ATR(14) needs 14
    if (ctx.i < 20) return null;

    const rsi   = ctx.rsi(14, 0);
    const rsi1  = ctx.rsi(14, 1);
    const stoch = ctx.stoch(14, 3, 0);
    const atr   = ctx.atr(14, 0);

    if (rsi == null || rsi1 == null || stoch == null || stoch.k == null || atr == null) return null;

    // Entry: both oscillators deeply oversold
    const entrySignal = rsi < 35 && stoch.k < 30;

    // Partial exit: RSI crosses above 60
    const rsiCrossed60 = rsi1 < 60 && rsi >= 60;

    // Full exit: RSI crosses above 70 OR ATR stop-loss
    const rsiCrossed70 = rsi1 < 70 && rsi >= 70;

    // Stop-loss: 1.5× ATR below entry price
    const stopPx = ctx.entryPx - 1.5 * atr;
    const stopHit = ctx.position > 0 && ctx.price <= stopPx;

    // ── TRADING LOGIC ─────────────────────────────────────────────────────
    if (ctx.position === 0 && entrySignal) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    if (ctx.position > 0) {
        // Partial profit-taking at RSI 60 — sell 50% of position
        if (rsiCrossed60) {
            return { side: 'sell', qty: ctx.position * 0.5 };
        }
        // Full exit at RSI 70 or ATR stop
        if (rsiCrossed70 || stopHit) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
