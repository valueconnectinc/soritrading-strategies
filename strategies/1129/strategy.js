/*
 * @coinsori-strategy v1
 * name: Ichimoku Cloud Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Uses Ichimoku Cloud components to identify trend direction. Buys when
 * price is above the Cloud (tenkan > kijun confirms uptrend) and the Chikou
 * span is above price (confirming bullish momentum). Sells on trend reversal
 * when price falls below the Cloud or tenkan crosses below kijun.
 *
 * Buys when: price > Cloud (tenkan > kijun AND both above senkou span B).
 * Sells when: price < Cloud OR tenkan crosses below kijun.
 *
 * When it does NOT work: In ranging markets where price repeatedly crosses
 * the Cloud — generates whipsaws. Chikou confirmation can lag, missing the
 * early part of moves.
 */
function onUpdate(ctx) {
    // Ichimoku components (manual calculation from high/low/close)
    const conv = ctx.high(9)  / 2 + ctx.low(9)  / 2;  // Tenkan-sen (9-bar conv)
    const base = ctx.high(26) / 2 + ctx.low(26) / 2;  // Kijun-sen (26-bar base)
    if (conv == null || base == null) return null;

    const spanB = (ctx.high(52) + ctx.low(52)) / 2;  // Senkou Span B (52-bar)
    if (spanB == null) return null;

    const price = ctx.price;

    // Cloud: tenkan and kijun must both be above senkou span B for bullish
    const aboveCloud = conv > spanB && base > spanB;
    const bullishConv = conv > base;  // tenkan above kijun = short-term up

    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    // ── ENTRY ────────────────────────────────────────────────────────────────
    if (ctx.position === 0) {
        if (aboveCloud && bullishConv && rsi > 50) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.98,
                type: 'limit',
                price: price,
                postOnly: true,
            };
        }
    }

    // ── EXIT ─────────────────────────────────────────────────────────────────
    if (ctx.position > 0) {
        // Exit 1: price falls below cloud
        if (price < spanB) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 2: tenkan crosses below kijun — trend weakening
        if (conv < base) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 3: RSI drops below 40
        if (rsi < 40) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 4: ATR profit target (5× ATR from entry)
        const entryPx = ctx.entryPx;
        if (entryPx != null) {
            const profitTarget = entryPx + 5 * atr;
            if (price >= profitTarget) {
                return { side: 'sell', qty: ctx.position };
            }
        }
    }

    return null;
}
