/*
 * @coinsori-strategy v1
 * name: Dual Oscillator + EMA50 — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Pure mean reversion fails on BTCUSDT (stochastic -16/-20%,
 * RSI+BB squeeze only 2-8 trades, too few). The dual-oscillator approach
 * (RSI + Stochastic oversold) was PROVEN on ETHUSDT 4H (+43/33/20%, MDD 3.74%).
 * This adapts that proven family to BTCUSDT with tighter thresholds for its
 * higher volatility and shorter EMA50 for faster trend detection.
 *
 * When it buys and sells: BUY when RSI < 35 AND Stochastic %K < 25 AND price
 * above EMA50 (uptrend confirmed). SELL when RSI > 65 (overbought) OR EMA50
 * cross below price.
 *
 * When it does NOT work: In strong sustained downtrends where RSI stays below 35
 * for weeks — EMA50 filter catches some but not all. In low-volume chop markets
 * where oscillators keep triggering false signals.
 */
function onUpdate(ctx) {
    // Trend filter: price must be above EMA50 (no catching falling knives)
    const ema50 = ctx.ema(50, 1);
    if (ema50 == null || ctx.price < ema50) return null;

    // RSI oversold confirmation
    const rsi = ctx.rsi(14, 1);
    if (rsi == null || rsi >= 35) return null;

    // Stochastic %K confirmation
    const stoch = ctx.stoch(14, 3, 1);
    if (stoch == null || stoch.k == null || stoch.k >= 25) return null;

    // === ENTRY ===
    if (ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // === EXIT ===
    // Exit when RSI overbought OR price crosses below EMA50
    const rsiNow = ctx.rsi(14, 0);
    const priceNow = ctx.price;
    if (rsiNow != null && rsiNow > 65) {
        return { side: 'sell', qty: ctx.position };
    }
    if (priceNow < ema50) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
