/*
 * @coinsori-strategy v1
 * name: Bollinger Band + RSI Mean Reversion v2
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Combines Bollinger Bands (20,2) and RSI(14) for mean reversion entries.
 * Enters when price touches the lower Bollinger Band AND RSI < 40 (confirming oversold).
 * Exits when price reaches the middle band (SMA20) OR RSI rises above 55.
 * Only enters if price is above SMA200 (avoids downtrends).
 * More signals than the pure RSI-extreme strategy — Bollinger Band touch adds an
 *   extra entry trigger that catches SOL's frequent lower-band touches.
 * Works best in range-bound and slightly bullish markets.
 * Loses in strong sustained downtrends where price stays glued to the lower band.
 */

function onUpdate(ctx) {
    const price   = ctx.price;
    const rsi     = ctx.rsi(14);
    const sma200  = ctx.sma(200);
    const bb      = ctx.bb(20, 2);

    if (rsi == null || sma200 == null || bb == null) return null;

    const lower   = bb.lower;
    const middle  = bb.middle;
    const position = ctx.position;

    // ── ENTRY: price at lower BB + RSI confirming oversold + above SMA200 ──
    if (position === 0 && price <= lower && rsi < 40 && price > sma200) {
        const riskAmt = ctx.cash * 0.02;
        const stopPx  = lower * 0.95;                   // 5% below lower band
        const qty     = riskAmt / (lower - stopPx);
        if (qty > 0) return { side: 'buy', qty: qty * 0.99 };
    }

    // ── EXIT: price at middle band OR RSI overbought ──
    if (position > 0) {
        const atMiddle = price >= middle;
        const rsiHigh  = rsi > 55;
        if (atMiddle || rsiHigh) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
