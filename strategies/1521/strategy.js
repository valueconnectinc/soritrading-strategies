/*
 * @coinsori-strategy v1
 * name: EMA20 Trend Filter + RSI Pullback on AVAXUSDT
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: AVAX is a high-beta altcoin that often swings 20–40%
 * intracycle. When it pulls back in a confirmed uptrend (price above EMA20),
 * RSI < 35 catches the exhaustion point and price mean-reverts back up.
 * This is a different symbol from BTC/SOL tested in prior cycles, and
 * AVAX's higher volatility makes the EMA20 trend filter especially valuable
 * for staying long only in genuine uptrends.
 * When it buys and sells: Buy when price > EMA20 (uptrend confirmed) AND
 * RSI(14) < 35 (oversold pullback). Sell when price crosses below EMA20 OR
 * RSI climbs above 65.
 * When it does NOT work: In sustained bear markets where price never
 * reclaims EMA20, or during low-volume illiquid periods when AVAX gaps
 * against entries.
 */
function onUpdate(ctx) {
    // ── Trend filter: price must be above EMA20 ─────────────────────
    const ema20 = ctx.ema(20, 0);
    if (ema20 == null) return null;

    const inUptrend = ctx.price > ema20;

    // ── RSI ─────────────────────────────────────────────────────────
    const rsiNow  = ctx.rsi(14, 0);
    const rsiPrev = ctx.rsi(14, 1);
    if (rsiNow == null || rsiPrev == null) return null;

    // ── ATR regime cap — reject extreme volatility ──────────────────
    const atrNow = ctx.atr(14);
    if (atrNow == null) return null;
    // AVAX is high-vol: cap at 12% to keep violent liquidation spikes out
    if (atrNow / ctx.price > 0.12) return null;

    // ── Position management ──────────────────────────────────────────
    if (ctx.position === 0) {
        // BUY: in uptrend + RSI oversold pullback
        if (inUptrend && rsiNow < 35) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        return null;
    }

    // In position — exit on trend reversal or overbought
    const priceBelowEma = ctx.price < ema20;

    if (priceBelowEma || rsiNow > 65) {
        return { side: 'sell', qty: ctx.position };
    }

    // Stop-loss: 2.5× ATR below entry (wider for AVAX's wild swings)
    const drawdown = ctx.entryPx - ctx.price;
    if (drawdown > 0 && drawdown > 2.5 * atrNow) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
