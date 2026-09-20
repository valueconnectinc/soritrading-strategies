/*
 * @coinsori-strategy v1
 * name: Funding Rate Delta + RSI Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Funding rate delta (change) captures when crowd positioning is
 * accelerating — more informative than absolute level. Refined from strategy 1994
 * which had good direction but too few trades (2-9 per window).
 * When it buys and sells: Long when funding rate is declining (shorts piling in,
 * funding compressing) AND RSI oversold AND price above SMA50. Short when funding
 * rate is rising (longs crowding, funding expanding) AND RSI overbought AND below SMA50.
 * When it does NOT work: In slow grinding trends where funding changes gradually
 * without reversal. Also fails if Binance funding data is unavailable.
 */
function onUpdate(ctx) {
    // --- State: carry previous bar's funding rate to compute delta ---
    const s = ctx.state;
    if (!s.initialized) {
        s.initialized = true;
        s.prevFunding  = null;
        s.lastBarI    = -1;
    }

    const sma50 = ctx.sma(50);
    const rsi   = ctx.rsi(14);
    const atr   = ctx.atr(14);
    if (sma50 == null || rsi == null || atr == null) return null;

    // New bar detected → roll the funding snapshot
    if (s.lastBarI !== ctx.i) {
        s.prevFunding = s.lastFunding;
        s.lastFunding = ctx.macro('binance_funding');
        s.lastBarI    = ctx.i;
    }

    const fundingNow  = s.lastFunding;   // current bar funding (may be null if unavailable)
    const fundingPrev = s.prevFunding;   // previous bar funding

    // Funding delta: positive = expanding (bullish crowd), negative = compressing (bearish crowd)
    const fundingDelta = (fundingNow != null && fundingPrev != null)
        ? fundingNow - fundingPrev : null;

    const bullRegime = ctx.price > sma50;
    const bearRegime = ctx.price < sma50;

    // ── NO POSITION → check entry conditions ──
    if (ctx.position === 0) {
        // LONG: funding compressing (delta ≤ 0) + RSI oversold + bull regime
        // Relaxed from v1 (RSI 35→40) to generate more signals
        const fundingBearish = fundingDelta == null || fundingDelta <= 0;
        if (fundingBearish && rsi < 40 && bullRegime) {
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.99,
                stopPx: ctx.price - 2.0 * atr,
            };
        }

        // SHORT: funding expanding (delta ≥ 0) + RSI overbought + bear regime
        const fundingBullish = fundingDelta == null || fundingDelta >= 0;
        if (fundingBullish && rsi > 60 && bearRegime) {
            return {
                side: 'sell',
                qty: ctx.position,
                stopPx: ctx.price + 2.0 * atr,
            };
        }

        // FALLBACK: no funding data → pure RSI + SMA regime
        if (fundingNow == null) {
            if (rsi < 35 && bullRegime) {
                return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
            }
            if (rsi > 65 && bearRegime) {
                return { side: 'sell', qty: ctx.position };
            }
        }
    }

    // ── IN POSITION → exit on mean reversion or regime flip ──
    if (ctx.position > 0) {
        if (rsi > 50 || !bullRegime) {
            return { side: 'sell', qty: ctx.position };
        }
        const entryPx = ctx.entryPx || ctx.price;
        if (ctx.price < entryPx - 2.0 * atr) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    if (ctx.position < 0) {
        if (rsi < 50 || !bearRegime) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        const entryPx = ctx.entryPx || ctx.price;
        if (ctx.price > entryPx + 2.0 * atr) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
    }

    return null;
}
