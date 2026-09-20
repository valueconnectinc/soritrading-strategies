/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion with ATR Adaptive Stop
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: RSI oversold (<35) reliably bounces in this market (exp 273: +32-39% on ETHUSDT 4H). Adding an ATR-based adaptive stop-loss protects against outsized drawdowns when the bounce fails.
 * When it buys and sells: Buys when RSI drops below 35 AND price is above its short-term EMA (dips in a short-term uptrend tend to reverse). Sells when RSI reaches 65 OR price closes below EMA9 (mean reversion target hit or trend broken). ATR-based stop-loss caps max loss per trade at 2×ATR.
 * When it does NOT work: Fails in strong sustained downtrends where RSI stays oversold for extended periods — the EMA filter helps but cannot eliminate this. Also underperforms in sharp bull runs (expected for mean-reversion).
 */
function onUpdate(ctx) {
    // Warm-up: need at least 55 bars for EMA55 + ATR14
    if (ctx.i < 55) return null;

    const rsi   = ctx.rsi(14);
    const ema9  = ctx.ema(9);
    const ema55 = ctx.ema(55);
    const atr   = ctx.atr(14);

    if (rsi == null || ema9 == null || ema55 == null || atr == null) return null;

    const price     = ctx.price;
    const position  = ctx.position;
    const entryPx   = ctx.entryPx;

    // === EXIT LOGIC ===
    if (position > 0) {
        // Sell signal 1: RSI reached overbought zone
        if (rsi > 65) {
            return { side: 'sell', qty: position };
        }
        // Sell signal 2: price closed below EMA9 (trend broken)
        if (price < ema9) {
            return { side: 'sell', qty: position };
        }
        // Sell signal 3: price bounced back to EMA55 (full mean-reversion target)
        // Price was below EMA55 on entry; sell when it recovers to EMA55
        if (price >= ema55 && entryPx < ema55) {
            return { side: 'sell', qty: position };
        }
        // Hard stop: 2×ATR loss from entry
        const stopPx = entryPx - 2 * atr;
        if (price <= stopPx) {
            return { side: 'sell', qty: position };
        }
        return null;
    }

    // === ENTRY LOGIC ===
    // Buy when RSI oversold AND price is above EMA9 (short-term uptrend = dips reverse)
    // AND price is not too far below EMA55 (avoid catching falling knives)
    if (rsi < 35 && price > ema9 && price > ema55 * 0.95) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    return null;
}
