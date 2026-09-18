/*
 * @coinsori-strategy v1
 * name: RSI Momentum Crossover
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI momentum strategy: buys when RSI crosses above 50 (bullish momentum),
 * sells when RSI crosses below 50 (bearish momentum). Simple, well-known,
 * and tests a completely different signal family from EMA crossover.
 * When it does NOT work: in strong trends RSI stays above/below 50 for
 * extended periods, causing late entries and exits that miss most of the move.
 */

function onUpdate(ctx) {
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // Read closed bars for crossover detection
    const rsiPrev = ctx.rsi(14, 1);
    if (rsiPrev == null) return null;

    // ── ENTRY: RSI crosses ABOVE 50 — bullish momentum ──
    const bullishCross = rsiPrev <= 50 && rsi > 50;
    if (bullishCross && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── EXIT: RSI crosses BELOW 50 — bearish momentum ──
    const bearishCross = rsiPrev >= 50 && rsi < 50;
    if (bearishCross && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
