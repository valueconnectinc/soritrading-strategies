/*
 * @coinsori-strategy v1
 * name: Funding Rate Sentiment + RSI Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Funding rate reveals collective positioning — when shorts pay extreme
 * funding, that consensus is fragile and prone to squeeze. This is the opposite signal family
 * from price-based breakout/mean-reversion (which failed 6+ times).
 * When it buys and sells: Long when funding is deeply negative (shorts crowded) AND RSI
 * oversold AND price above 50-bar SMA. Short when funding is deeply positive (longs crowded)
 * AND RSI overbought AND price below SMA.
 * When it does NOT work: In sustained one-directional trends where funding stays extreme
 * without reversal. Also needs Binance futures funding data to be available.
 */
function onUpdate(ctx) {
    // --- Indicator warmup guard ---
    const sma50 = ctx.sma(50);
    const rsi = ctx.rsi(14);
    const atr = ctx.atr(14);
    if (sma50 == null || rsi == null || atr == null) return null;

    // --- Macro data: funding rate (perpetual futures bias signal) ---
    const funding = ctx.macro('binance_funding');
    // funding > 0 = longs paying shorts (bearish signal), funding < 0 = shorts paying longs (bullish signal)

    // --- Regime: trend direction via 50-bar SMA ---
    const bullRegime = ctx.price > sma50;
    const bearRegime = ctx.price < sma50;

    // --- Position state ---
    if (ctx.position === 0) {
        // ── NO POSITION → check entry conditions ──

        // LONG: funding deeply negative (shorts crowded) + RSI oversold + bull regime
        // Threshold -0.01% (1 bps) is where shorts start paying meaningful funding
        if (funding != null && funding < -0.0001 && rsi < 35 && bullRegime) {
            const stopPx = ctx.price - 2.0 * atr;
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.99,
                stopPx: stopPx,
            };
        }

        // SHORT: funding deeply positive (longs crowded) + RSI overbought + bear regime
        if (funding != null && funding > 0.0001 && rsi > 65 && bearRegime) {
            const stopPx = ctx.price + 2.0 * atr;
            return {
                side: 'sell',
                qty: ctx.position,
                stopPx: stopPx,
            };
        }

        // FALLBACK mean-reversion: no funding data available — use pure RSI + regime
        if (funding == null) {
            if (rsi < 30 && bullRegime) {
                const stopPx = ctx.price - 2.0 * atr;
                return {
                    side: 'buy',
                    qty: ctx.cash / ctx.price * 0.99,
                    stopPx: stopPx,
                };
            }
            if (rsi > 70 && bearRegime) {
                const stopPx = ctx.price + 2.0 * atr;
                return {
                    side: 'sell',
                    qty: ctx.position,
                    stopPx: stopPx,
                };
            }
        }
    }

    // ── IN POSITION → exit on mean reversion or regime flip ──
    if (ctx.position > 0) {
        // Long exit: RSI mean reversion to 50 (neutral), or regime flip
        if (rsi > 50 || !bullRegime) {
            return { side: 'sell', qty: ctx.position };
        }
        // Hard stop: price hits 2× ATR below entry
        const entryPx = ctx.entryPx || ctx.price;
        if (ctx.price < entryPx - 2.0 * atr) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    if (ctx.position < 0) {
        // Short exit: RSI mean reversion to 50, or regime flip
        if (rsi < 50 || !bearRegime) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
        // Hard stop: price hits 2× ATR above entry
        const entryPx = ctx.entryPx || ctx.price;
        if (ctx.price > entryPx + 2.0 * atr) {
            return { side: 'buy', qty: Math.abs(ctx.position) };
        }
    }

    return null;
}
