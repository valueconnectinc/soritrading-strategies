/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Bollinger Bands + RSI mean reversion on SOLUSDT 4H.
 * Buys when price bounces off the lower Bollinger Band with oversold RSI and rising volume.
 * Sells when price reverts to the middle band or RSI reaches overbought.
 * Works best in ranging/volatile markets; loses in strong sustained trends.
 */

function onUpdate(ctx) {
    // Bollinger Bands: 20-period, 2 standard deviations
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    const lower = bb.lower;
    const mid   = bb.mid;
    const upper = bb.upper;
    const price = ctx.price;

    // RSI 14
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // Volume confirmation
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;

    // ATR for trailing stop distance
    const atr = ctx.atr(14);
    if (atr == null) return null;

    // Check volume surge: current vol at least 1.2x the 20-bar average
    const volRatio = ctx.vol / avgVol;

    // ── ENTRY: price near or below lower band, RSI oversold, volume confirming ──
    // Price within 1% of lower band (bounce zone)
    const nearLower = price <= lower * 1.01;
    // RSI oversold (below 35)
    const rsiOversold = rsi < 35;
    // Volume picking up on the bounce
    const volConfirm  = volRatio > 1.2;

    // No position → look for entry
    if (ctx.position === 0) {
        if (nearLower && rsiOversold && volConfirm) {
            // Buy with 99% of available cash
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // ── EXIT: price reverted to middle band or RSI overbought ──
    if (ctx.position > 0) {
        // Take profit: price returned to middle Bollinger Band
        const atMid = price >= mid * 0.99;
        // Or RSI reached overbought (above 65)
        const rsiOverbought = rsi > 65;
        // Or stop-loss: price dropped more than 2× ATR from entry
        const sl = ctx.entryPx - 2 * atr;

        if (atMid || rsiOverbought || price <= sl) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
