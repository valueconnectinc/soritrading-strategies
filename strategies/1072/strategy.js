/*
 * @coinsori-strategy v1
 * name: RSI-14 Simple Daily BTC
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: RSI-14 on daily bars is a classic mean-reversion signal.
 * When RSI drops below 30 (oversold) the market tends to bounce; when it rises
 * above 70 (overbought) it tends to cool off.
 *
 * When it buys and sells: Buy when RSI crosses above 30 from below (oversold bounce).
 * Sell when RSI crosses below 70 from above (overbought cooldown) or when
 * price falls 5% from entry (hard stop).
 *
 * When it does NOT work: In strong trends RSI stays overbought/oversold for
 * extended periods — the strategy sells too early in rallies and buys too early
 * in crashes. Also fails in low-volatility chop where RSI oscillates near 50.
 */

function onUpdate(ctx) {
    const rsi   = ctx.rsi(14);
    const price = ctx.price;

    // Warm-up: RSI needs 14 bars
    if (rsi == null) return null;

    const rsi1 = ctx.rsi(14, 1);
    const rsi2 = ctx.rsi(14, 2);
    if (rsi1 == null || rsi2 == null) return null;

    const hasPos = ctx.position > 0;

    // ── Entry: RSI crosses above 30 (oversold bounce) ──────────────────────
    const rsiCrossUp = rsi2 < 30 && rsi1 >= 30 && rsi > 30;

    if (!hasPos && rsiCrossUp) {
        return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.99 };
    }

    // ── Exit: RSI crosses below 70 (overbought cooldown) or 5% stop ────────
    const rsiCrossDown = rsi2 >= 70 && rsi1 < 70;
    const stopLoss = ctx.entryPx > 0 && (ctx.entryPx - price) / ctx.entryPx > 0.05;

    if (hasPos && (rsiCrossDown || stopLoss)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
