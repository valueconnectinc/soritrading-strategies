/*
 * @coinsori-strategy v1
 * name: Daily EMA50 Filter + 4H RSI(2) Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Crypto trends strongly on the daily but pulls back violently
 * on lower timeframes. Catching pullbacks within the trend avoids chasing breakouts
 * and reduces whipsaw vs pure momentum crossover.
 *
 * When it buys: Price above Daily EMA50 (trend confirmed) AND RSI(2) on 4H drops
 * below 25 (extreme oversold pullback) — then bounces.
 *
 * When it sells: RSI(2) rises above 60 (momentum exhausted) OR ATR trailing stop
 * (3x ATR from entry) is hit.
 *
 * When it does NOT work: Strong bear trends where RSI(2) stays oversold for weeks
 * (mean-reversion within downtrend = catching falling knives). Also fails in
 * low-volatility chop where RSI(2) oscillates without directional moves.
 */

function onUpdate(ctx) {
    // 4H indicators
    const ema50_4h = ctx.ema(50);
    const rsi2 = ctx.rsi(2);
    const atr14 = ctx.atr(14);

    // Guard: warm-up
    if (ema50_4h == null || rsi2 == null || atr14 == null) return null;

    const price = ctx.price;
    const position = ctx.position;

    // === ENTRY: Daily EMA50 trend filter + RSI(2) pullback ===
    // We simulate daily EMA using EMA(50*6=300) on 4H bars (1 day = 6 x 4h bars)
    const ema300 = ctx.ema(300); // ~50 daily EMA proxy
    if (ema300 == null) return null;

    if (position === 0) {
        // Trend: price above daily EMA (50-day EMA proxy on 4H)
        const bullTrend = price > ema300;

        // Pullback: RSI(2) extremely oversold (< 25), bouncing (current > prev)
        const rsi2_1 = ctx.rsi(2, 1);
        const rsi2_2 = ctx.rsi(2, 2);
        if (rsi2_1 == null || rsi2_2 == null) return null;

        const rsiOversold = rsi2 < 25;
        const rsiBouncing = rsi2_1 > rsi2_2; // RSI rising = bounce starting

        if (bullTrend && rsiOversold && rsiBouncing) {
            const qty = ctx.cash / price * 0.98;
            return { side: 'buy', qty: qty };
        }
    }

    // === EXIT: RSI(2) exhaustion OR ATR trailing stop ===
    if (position > 0) {
        const rsi2_1 = ctx.rsi(2, 1);
        if (rsi2_1 == null) return null;

        // Exit 1: RSI(2) overbought — momentum exhausted
        if (rsi2 > 60 && rsi2_1 < rsi2) {
            return { side: 'sell', qty: position };
        }

        // Exit 2: ATR trailing stop (3x ATR from highest price since entry)
        const entryPx = ctx.entryPx || price;
        const hiPx = ctx.state.hiPx || entryPx;

        if (price > hiPx) {
            ctx.state.hiPx = price;
        }

        const trailPx = (ctx.state.hiPx || price) - 3.0 * atr14;
        if (price <= trailPx) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
