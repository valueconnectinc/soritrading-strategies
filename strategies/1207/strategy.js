/*
 * @coinsori-strategy v1
 * name: Dual Oscillator with Trend Filter & ATR Stop
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion on deeply oversold conditions (RSI + Stochastic)
 * WITH a trend filter so we only fade the market when the broader trend agrees.
 * ATR stop-loss caps per-trade loss; partial profit-taking locks gains early.
 * When it buys and sells: Buy when RSI < 35, Stochastic %K < 30, AND price > EMA50.
 * Sell: take 50% at RSI 60, remaining at RSI 70 or ATR stop-loss.
 * When it does NOT work: Strong downtrends where price never reclaims EMA50 — the
 * trend filter blocks entries precisely when oversold conditions appear. Also
 * whipsaws in choppy markets where RSI oscillates around 50 repeatedly.
 */

function onUpdate(ctx) {
    // Warmup: EMA50 needs ~50 bars, RSI/Stoch need ~17
    if (ctx.i < 60) return null;

    // Indicators
    const rsi  = ctx.rsi(14, 0);
    const rsi1 = ctx.rsi(14, 1);
    const stoch = ctx.stoch(14, 3, 0);
    const ema50 = ctx.ema(50, 0);
    const atr   = ctx.atr(14, 0);

    if (rsi == null || rsi1 == null || stoch == null || stoch.k == null ||
        ema50 == null || atr == null) return null;

    // Trend filter: price must be above EMA50 (bullish bias confirmed)
    const aboveTrend = ctx.price > ema50;

    // Entry: both oscillators deeply oversold + trend agrees
    const entrySignal = rsi < 35 && stoch.k < 30 && aboveTrend;

    // Partial exit 1: RSI crosses above 60 — take 50% profit
    const rsiCrossed60 = rsi1 < 60 && rsi >= 60;

    // Full exit: RSI crosses above 70 OR ATR stop-loss triggered
    const rsiCrossed70 = rsi1 < 70 && rsi >= 70;
    const stopLossPx = ctx.position > 0
        ? ctx.entryPx - 1.5 * atr  // 1.5× ATR below entry
        : 0;
    const stopHit = ctx.position > 0 && ctx.price <= stopLossPx;

    // ── POSITION MANAGEMENT ──────────────────────────────────────────────
    // ctx.position holds total qty; we track partial exits via a simple
    // "first exit done" flag stored in a closure variable.
    // Since onUpdate has no persistent state, we approximate by checking:
    // if position > 0 and rsi crossed 60, we sell 50% now.
    // If position > 0 and (rsi crossed 70 OR stop hit), we sell the rest.

    if (ctx.position === 0 && entrySignal) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    if (ctx.position > 0) {
        // Partial exit: 50% at RSI 60
        if (rsiCrossed60) {
            const qty50 = ctx.position * 0.5;
            return { side: 'sell', qty: qty50 };
        }
        // Full exit: RSI 70 or ATR stop
        if (rsiCrossed70 || stopHit) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
