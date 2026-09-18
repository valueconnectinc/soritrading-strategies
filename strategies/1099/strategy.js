/*
 * @coinsori-strategy v1
 * name: RSI-30 Oversold ATR Stop 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: RSI-30 is historically a strong oversold zone on BTC daily —
 *   the market tends to bounce from deep oversold. ATR stop gives trades room
 *   to breathe and locks in profits when momentum fades.
 * When it buys and sells: Buy when RSI(14) drops below 30 (deep oversold).
 *   Sell when RSI rises above 65 (momentum cooling) OR ATR stop is hit.
 * When it does NOT work: In strong bear trends RSI stays oversold for weeks —
 *   buying "oversold" just catches a falling knife. Also misses early in trends
 *   since RSI only signals after a pullback has already happened.
 */
function onUpdate(ctx) {
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    const pos = ctx.position;

    // ── BUY: RSI deep oversold ─────────────────────────────────────────────
    if (pos === 0) {
        if (rsi < 30) {
            const stopPx = ctx.price - 2 * atr; // 2× ATR stop below entry
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.99,
                stopPx: stopPx,
            };
        }
    }

    // ── SELL: RSI overbought OR ATR stop triggers automatically ───────────
    if (pos > 0) {
        if (rsi > 65) {
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
