/*
 * @coinsori-strategy v1
 * name: EMA50 Trend + RSI40 Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: v1 (1631) used RSI<35 which was too tight — only 6 trades
 * in the middle window. v2 loosens to RSI<40 (the classic oversold level) while
 * keeping the price>EMA50 trend guard (not EMA20 momentum, which conflicted with
 * the pullback signal in earlier versions).
 * When it buys and sells: BUY when RSI crosses below 40 while price holds
 * above EMA50. SELL when RSI rises above 65 OR price closes below EMA50.
 * When it does NOT work: in strong bear trends where price stays below
 * EMA50 — no trades. In low-volatility chop where RSI oscillates around 40.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────
    const rsi_1   = ctx.rsi(14, 1);
    const rsi_2   = ctx.rsi(14, 2);
    const ema50_1 = ctx.ema(50, 1);
    const close1  = ctx.closes[1];

    if (rsi_1 == null || rsi_2 == null || ema50_1 == null || close1 == null) {
        return null;
    }

    // ── Trend guard: price above EMA50 (structural uptrend) ─────────────
    const priceAboveEMA50 = close1 > ema50_1;

    // ── Entry signal ────────────────────────────────────────────────────
    // RSI crosses below 40: classic oversold, looser than 35 → more trades.
    const rsiCrossDown40 = rsi_2 >= 40 && rsi_1 < 40;

    // ── Exit signals ─────────────────────────────────────────────────────
    const rsiOverbought   = rsi_1 > 65;
    const priceBelowEMA50 = close1 < ema50_1;

    // ── BUY ─────────────────────────────────────────────────────────────
    if (ctx.position === 0 && rsiCrossDown40 && priceAboveEMA50) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── SELL ────────────────────────────────────────────────────────────
    if (ctx.position > 0 && (rsiOverbought || priceBelowEMA50)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
