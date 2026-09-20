/*
 * @coinsori-strategy v1
 * name: BB Expansion Trend Follower v2
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Volatility-regime trend follower using Bollinger Band WIDTH to detect
 * expanding volatility (breakouts) vs contracting volatility (chop).
 * Enters on BB expansion in trend direction; uses ATR-based stop-loss
 * and tighter exit rules to reduce the large MDD seen in v1.
 * When it does NOT work: low-volume choppy markets with no BB expansion.
 */
function onUpdate(ctx) {
    const bbN = 20, bbK = 2;
    const bb = ctx.bb(bbN, bbK, 0);
    const bbPrev = ctx.bb(bbN, bbK, 1);
    if (!bb || !bbPrev || bb.mid == null || bbPrev.mid == null) return null;

    const ema9  = ctx.ema(9,  0);
    const ema21 = ctx.ema(21, 0);
    const ema9P  = ctx.ema(9,  1);
    const ema21P = ctx.ema(21, 1);
    if (ema9 == null || ema21 == null || ema9P == null || ema21P == null) return null;

    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;

    const atr = ctx.atr(14, 0);
    if (atr == null) return null;

    // BB width normalized: (upper-lower)/mid — comparable across price levels
    const width     = (bb.upper - bb.lower) / bb.mid;
    const widthPrev = (bbPrev.upper - bbPrev.lower) / bbPrev.mid;

    // Width expansion rate: >0 means volatility increasing
    const widthRate   = widthPrev > 0 ? (width - widthPrev) / widthPrev : 0;
    // Width contraction rate for exits
    const widthContra = widthPrev > 0 ? (widthPrev - width) / widthPrev : 0;

    // ATR stop distance: 2x ATR from entry — tighter than default
    const atrStopDist = atr * 2;

    // === TREND DETECTION ===
    const bullCross = ema9 > ema21 && ema9P <= ema21P;
    const bearCross = ema9 < ema21 && ema9P >= ema21P;

    // === ENTRY LOGIC ===
    if (ctx.position === 0) {
        // LONG: BB expansion + bullish EMA cross + price above mid-band + RSI > 52
        if (widthRate > 0.05 && bullCross && ema9 > bb.mid && rsi > 52) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        // SHORT: BB expansion + bearish EMA cross + price below mid-band + RSI < 48
        if (widthRate > 0.05 && bearCross && ema9 < bb.mid && rsi < 48) {
            return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // === EXIT / STOP LOGIC ===
    if (ctx.position > 0) {
        // ATR-based stop: exit if price drops 2x ATR from entry
        const stopPx = ctx.entryPx - atrStopDist;
        if (ctx.price <= stopPx) {
            return { side: 'sell', qty: ctx.position };
        }
        // Trailing exit: BB contracting OR RSI drops below 45
        if (widthContra > 0.10 || rsi < 45) {
            return { side: 'sell', qty: ctx.position };
        }
    }
    if (ctx.position < 0) {
        // ATR-based stop for shorts
        const stopPx = ctx.entryPx + atrStopDist;
        if (ctx.price >= stopPx) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        // Trailing exit: BB contracting OR RSI rises above 55
        if (widthContra > 0.10 || rsi > 55) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
    }

    return null;
}
