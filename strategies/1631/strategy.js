/*
 * @coinsori-strategy v1
 * name: EMA50 Trend + RSI35 Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: v2/v3 used EMA20 rising as trend guard but that
 * conflicts with RSI=40 pullback — at the pullback bottom, EMA20 is often
 * flat. This version uses price > EMA50 (looser, structural trend check)
 * instead of EMA20 momentum, and tightens RSI to 35 for a more confident
 * oversold entry. Simpler filters = more trades.
 * When it buys and sells: BUY when RSI crosses below 35 while price holds
 * above EMA50 (confirmed uptrend). SELL when RSI rises above 65 OR price
 * closes below EMA50 (trend broken).
 * When it does NOT work: in strong bear trends where price stays below
 * EMA50 — no trades. In low-volatility chop where RSI oscillates around 35.
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
    // Looser than EMA20 rising — just checks price position, not momentum.
    // This avoids the conflict where EMA20 flattens at the pullback bottom.
    const priceAboveEMA50 = close1 > ema50_1;

    // ── Entry signal ────────────────────────────────────────────────────
    // RSI crosses below 35: tighter than 40, more confident oversold.
    const rsiCrossDown35 = rsi_2 >= 35 && rsi_1 < 35;

    // ── Exit signals ─────────────────────────────────────────────────────
    const rsiOverbought  = rsi_1 > 65;
    const priceBelowEMA50 = close1 < ema50_1;

    // ── BUY ─────────────────────────────────────────────────────────────
    if (ctx.position === 0 && rsiCrossDown35 && priceAboveEMA50) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── SELL ────────────────────────────────────────────────────────────
    if (ctx.position > 0 && (rsiOverbought || priceBelowEMA50)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
