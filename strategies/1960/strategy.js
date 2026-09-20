/*
 * @coinsori-strategy v1
 * name: BB Expansion Trend Follower
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Uses Bollinger Band WIDTH expansion to detect volatility breakouts,
 * combined with trend alignment (EMA crossover) and RSI confirmation.
 * Enters when volatility expands in the direction of the trend.
 * Exits when volatility contracts — the signal is "volatility precedes price."
 * When it does NOT work: choppy low-volatility markets where BB contracts
 * constantly; strong one-directional trends without volatility expansion.
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

    // BB width normalized: (upper-lower)/mid — comparable across price levels
    const width     = (bb.upper - bb.lower) / bb.mid;
    const widthPrev = (bbPrev.upper - bbPrev.lower) / bbPrev.mid;

    // Width expansion rate: >0 means volatility is increasing
    const widthRate = widthPrev > 0 ? (width - widthPrev) / widthPrev : 0;

    // Width contraction rate for exits (positive = contracting)
    const widthContract = widthPrev > 0 ? (widthPrev - width) / widthPrev : 0;

    // === TREND DETECTION ===
    // EMA9 crosses above EMA21 = bullish trend confirmed
    const bullTrend = ema9 > ema21 && ema9P <= ema21P;
    // EMA9 crosses below EMA21 = bearish trend confirmed
    const bearTrend = ema9 < ema21 && ema9P >= ema21P;

    // === ENTRY LOGIC ===
    if (ctx.position === 0) {
        // LONG: volatility expanding + bullish trend + RSI confirming
        // widthRate > 0.05: BB width expanding at least 5% vs prior bar
        // ema9 > bb.mid: price above mid-band confirms uptrend
        // rsi > 50: momentum alive, not overbought
        if (widthRate > 0.05 && bullTrend && ema9 > bb.mid && rsi > 50) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        // SHORT: volatility expanding + bearish trend + RSI confirming
        // rsi < 50: momentum down, not oversold
        if (widthRate > 0.05 && bearTrend && ema9 < bb.mid && rsi < 50) {
            return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // === EXIT LOGIC ===
    if (ctx.position !== 0) {
        // Exit long: BB width contracting significantly OR RSI drops below 40
        if (ctx.position > 0 && (widthContract > 0.15 || rsi < 40)) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit short: BB width contracting significantly OR RSI rises above 60
        if (ctx.position < 0 && (widthContract > 0.15 || rsi > 60)) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
    }

    return null;
}
