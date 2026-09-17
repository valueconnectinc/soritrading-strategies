/*
 * @coinsori-strategy v1
 * name: Fear-and-Greed Momentum Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Fear & Greed index is a behavioral sentiment proxy — markets
 * tend to mean-revert after extreme fear and trend after greed. We use it as a
 * regime filter to avoid buying in panic and to hold through rallies.
 *
 * When it buys and sells: Buy when RSI crosses above 40 (oversold bounce) while
 * Fear & Greed is above 30 (not extreme fear — the market still has energy).
 * Sell when RSI crosses below 60 (momentum cooling) or when Fear & Greed drops
 * below 25 (extreme fear regime, exit immediately).
 *
 * When it does NOT work: In choppy, low-volume markets where RSI oscillates
 * around thresholds without trending — the filter adds no signal and fees erode
 * the edge. Also fails in prolonged bear trends where Fear & Greed stays in
 * the 30-50 neutral band for months.
 */

function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────
    const rsi   = ctx.rsi(14);
    const sma20 = ctx.sma(20);
    const sma5  = ctx.sma(5);
    const fg    = ctx.data('fg');   // Fear & Greed index 0-100

    // Guard: warm-up
    if (rsi == null || sma20 == null || sma5 == null) return null;

    // ── Regime filter: only trade when Fear & Greed is not extreme fear ───
    // Below 25 = extreme fear, below 30 = fear — both are headwinds for momentum
    const fgThreshold = 30;
    if (fg == null || fg < fgThreshold) {
        // In fear regime: close position if open
        if (ctx.position > 0) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    // ── Entry: RSI bounces from oversold while price above SMA20 ───────────
    // ago=1 reads the closed previous bar; ago=2 reads the bar before that
    const rsi1  = ctx.rsi(14, 1);
    const rsi2  = ctx.rsi(14, 2);
    const price = ctx.price;

    if (rsi1 == null || rsi2 == null) return null;

    const rsiRising = rsi1 > rsi2;                          // RSI is accelerating upward
    const rsiCross  = rsi2 <= 40 && rsi1 > 40;             // Cross above oversold threshold
    const aboveMA   = price > sma20;                        // Trend not broken
    const shortAbove = sma5 > sma20;                        // Short-term momentum aligned

    const hasPosition = ctx.position > 0;

    if (!hasPosition && rsiCross && rsiRising && aboveMA && shortAbove) {
        // Market buy with 99% of cash
        return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.99 };
    }

    // ── Exit: RSI cools off or short MA crosses below long MA ───────────────
    const sma5_1  = ctx.sma(5, 1);
    const sma20_1 = ctx.sma(20, 1);
    if (sma5_1 == null || sma20_1 == null) return null;

    const rsiCooling = rsi2 >= 60 && rsi1 < 60;            // RSI crosses below 60
    const maDeath    = sma5 <= sma20 && sma5_1 > sma20_1;  // Short MA crosses below long MA
    const stopLoss   = ctx.entryPx > 0 && (ctx.entryPx - price) / ctx.entryPx > 0.05; // 5% hard stop

    if (hasPosition && (rsiCooling || maDeath || stopLoss)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
