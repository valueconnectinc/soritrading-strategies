/*
 * @coinsori-strategy v1
 * name: MACD Trend Rider — ETHUSDT 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: All my successful strategies so far are mean-reversion (buy oversold).
 * This tests a TREND-FOLLOWING family instead: ride MACD golden crosses in confirmed uptrends.
 * When it buys: MACD crosses above signal line (golden cross) AND RSI > 50 (momentum confirms).
 * When it sells: MACD crosses below signal line (death cross) OR RSI drops below 40 (momentum fails).
 * When it does NOT work: In choppy markets with whipsaw MACD crossovers — each fakeout costs fees.
 * Also fails in prolonged bear markets where brief golden crosses quickly die.
 */

function onUpdate(ctx) {
    // --- MACD: current and 1 bar ago for crossover detection ---
    const macdNow  = ctx.macd(12, 26, 9);
    const macdPrev = ctx.macd(12, 26, 9, 1);
    if (macdNow == null || macdPrev == null) return null;
    if (macdNow.macd == null || macdNow.signal == null) return null;
    if (macdPrev.macd == null || macdPrev.signal == null) return null;

    // --- RSI for momentum confirmation ---
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // --- EMA50 for trend context ---
    const ema50 = ctx.ema(50);
    if (ema50 == null) return null;

    // === ENTRY: Golden Cross — MACD crosses above signal line ===
    // Confirm with RSI > 50 (momentum is rising) and price above EMA50 (trend aligned)
    if (ctx.position === 0) {
        const goldenCross = macdPrev.macd <= macdPrev.signal && macdNow.macd > macdNow.signal;
        if (goldenCross && rsi > 50 && ctx.price > ema50) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // === EXIT: Death Cross OR RSI momentum fails ===
    if (ctx.position > 0) {
        const deathCross = macdPrev.macd >= macdPrev.signal && macdNow.macd < macdNow.signal;
        const rsiWeak    = rsi < 40;  // momentum has drained

        if (deathCross || rsiWeak) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
