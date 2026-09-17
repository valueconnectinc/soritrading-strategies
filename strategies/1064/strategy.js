/*
 * @coinsori-strategy v1
 * name: Donchian RSI Breakout 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when BTC closes above the 20-bar Donchian upper band with RSI confirming
 * bullish momentum. A 50-bar SMA trend filter ensures we only trade with the trend.
 * Sells when price drops below the 10-bar lower band or RSI falls below 40.
 * Struggles in choppy, low-volume markets where breakouts fail repeatedly.
 */

function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────
    const rsi = ctx.rsi(14);
    const sma50 = ctx.sma(50);
    if (rsi == null || sma50 == null) return null;

    // ── Donchian channels (ago=1 = last closed bar) ──────────
    const upperBand = ctx.high(20, 1);   // highest high of prior 20 bars
    const lowerBand = ctx.low(10, 1);    // lowest low of prior 10 bars
    if (upperBand == null || lowerBand == null) return null;

    // ── Trend filter: price above 50-bar SMA ─────────────────
    const aboveTrend = ctx.price > sma50;

    // ── Entry: close above upper Donchian + RSI confirm + trend ─
    const currClose = ctx.closes[0];
    const hasPosition = ctx.position > 0;

    if (!hasPosition && currClose != null && currClose > upperBand && rsi > 50 && rsi < 80 && aboveTrend) {
        // Risk 1 % of cash per trade
        const riskAmt  = ctx.cash * 0.01;
        const atr      = ctx.atr(14);
        const stopDist = atr != null ? atr : (ctx.price * 0.02);
        const qty      = riskAmt / stopDist;
        return { side: 'buy', qty: qty };
    }

    // ── Exit conditions ─────────────────────────────────────
    if (hasPosition) {
        // Stop 1: close falls below lower Donchian band
        if (currClose != null && currClose < lowerBand) {
            return { side: 'sell', qty: ctx.position };
        }

        // Stop 2: RSI momentum fades below 40
        if (rsi < 40) {
            return { side: 'sell', qty: ctx.position };
        }

        // Take-profit: RSI overbought above 80
        if (rsi > 80) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
