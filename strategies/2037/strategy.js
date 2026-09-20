/*
 * @coinsori-strategy v1
 * name: Funding-OI Macro Regime + RSI Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Breakout and pure mean-reversion strategies both failed on BTC 4H
 * because they have no regime awareness — they apply the same rules in bull, bear, and
 * sideways markets. This strategy uses Binance funding rate as a macro regime sensor:
 * high funding (>0.01%) signals an overleveraged long market (dangerous for longs),
 * low/negative funding signals a balanced or short-heavy market (good for longs).
 *
 * When it buys and sells: Only buy when (1) funding rate is below 0.01% (not over-
 * leveraged longs), (2) RSI < 35 (oversold), AND (3) price is below EMA20 (downtrend).
 * Sell when RSI > 65 OR price crosses above EMA20 (mean reversion complete).
 * Stay flat when funding > 0.03% (too dangerous to be long).
 *
 * When it does NOT work: In strong ETF-driven bull markets where funding stays low
 * but price grinds up — the EMA20 filter keeps you out of the best rallies.
 * Also fails in choppy low-volume markets with no clear direction.
 */
function onUpdate(ctx) {
    const rsi  = ctx.rsi(14);
    const ema20 = ctx.ema(20);
    if (rsi == null || ema20 == null) return null;

    const price    = ctx.price;
    const position = ctx.position;

    // Funding rate as regime sensor
    // ctx.macroSeries returns an object keyed by series name
    const macros = ctx.macroSeries;
    const fundingRaw = macros && macros.funding;
    const funding = (typeof fundingRaw === 'number') ? fundingRaw : null;

    // === ENTRY: low funding + oversold + below EMA20 ===
    // Low funding = not a crowded long trade, mean reversion more likely to work
    if (!position && rsi < 35 && price < ema20) {
        // Only enter if funding is not dangerously high
        // funding > 0.03% means too many leveraged longs — stay out
        if (funding === null || funding < 0.03) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    // === EXIT: mean reversion complete ===
    if (position && (rsi > 65 || price > ema20)) {
        return { side: 'sell', qty: position };
    }

    return null;
}
