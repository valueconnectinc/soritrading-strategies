/*
 * @coinsori-strategy v1
 * name: EMA200 Trend Filter + RSI/Volume Bounce
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The cycle-41 Volume+RSI strategy won in bull windows but lost
 * 15% in a bear window — buying oversold in a downtrend catches falling knives.
 * Adding an EMA200 trend filter (price must be above EMA200) prevents counter-trend
 * entries and keeps the strategy in the direction of the major trend.
 * When it buys and sells: Buys when price is above its 200-bar EMA (major trend is up),
 * RSI drops below 35 (oversold), and volume spikes above 1.8× its 20-bar average.
 * Sells when RSI recovers above 65 or when price falls 4% below the entry point.
 * When it does NOT work: In strong sustained downtrends the EMA200 filter stays below
 * price and the strategy sits idle — it misses the entire bear market.
 * In choppy markets where price oscillates around EMA200 it can flip in and out
 * of alignment, causing whipsaw near the trend line.
 */

function onUpdate(ctx) {
    // Warm-up: need at least 200 bars for EMA200 + 20 bars for avg volume
    const ema200 = ctx.ema(200);
    const avgVol = ctx.avgVol(20);
    const rsi = ctx.rsi(14);
    if (ema200 == null || avgVol == null || avgVol === 0 || rsi == null) return null;

    // Trend filter: price must be above EMA200 — only trade with the major trend
    const trendUp = ctx.price > ema200;

    // Volume spike: current volume must be 1.8× the 20-bar average
    const volSpike = ctx.vol > avgVol * 1.8;

    // RSI oversold: below 35 means price has dropped sharply from recent levels
    const rsiOversold = rsi < 35;

    // Entry: trend up + RSI oversold + volume spike
    if (!ctx.position && trendUp && rsiOversold && volSpike) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // Exit if in position
    if (ctx.position > 0) {
        // Stop-loss: price fell 4% below entry
        const entryPx = ctx.entryPx;
        if (entryPx != null && ctx.price < entryPx * 0.96) {
            return { side: 'sell', qty: ctx.position };
        }

        // RSI exit: RSI recovered above 65 — price is no longer cheap
        if (rsi > 65) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
