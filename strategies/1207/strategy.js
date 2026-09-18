/*
 * @coinsori-strategy v1
 * name: Direct Dual Oscillator
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Uses RSI + Stochastic oversold directly (no crossover trigger)
 * — the thresholds are already strict enough to filter noise. RSI neutral exit
 * (crossing above 50) captures mean reversion moves cleanly.
 * When it buys and sells: Buy when RSI < 35 AND Stochastic %K < 30 on the same bar.
 * Sell when RSI crosses above 50 (momentum normalized = exit signal).
 * When it does NOT work: Strong trends where oscillators stay oversold for long
 * periods — the strategy will either miss entries or hold through drawdowns.
 */

function onUpdate(ctx) {
    // Warmup: RSI(14) needs 14 bars, BB(20) needs 20, Stoch(14,3) needs 17
    if (ctx.i < 30) return null;

    // 4H RSI (14)
    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;

    // 4H Stochastic %K (14, 3)
    const stoch = ctx.stoch(14, 3, 0);
    if (stoch == null || stoch.k == null) return null;

    // Previous bar RSI for exit crossover
    const rsi1 = ctx.rsi(14, 1);
    if (rsi1 == null) return null;

    // Entry: both oscillators deeply oversold on this bar
    const entrySignal = rsi < 35 && stoch.k < 30;

    // Exit: RSI crosses above 50 (momentum normalized = take profit zone)
    const prevRsiBelow50 = rsi1 < 50;
    const nowRsiAbove50 = rsi > 50;
    const exitSignal = prevRsiBelow50 && nowRsiAbove50;

    if (ctx.position === 0 && entrySignal) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    if (ctx.position > 0 && exitSignal) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
