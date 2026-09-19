/*
 * @coinsori-strategy v1
 * name: BB ATR Mean Reversion (mid-band exit)
 * ex: binance
 * syms: NEARUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Bollinger Band mean reversion on NEARUSDT 4H — price that drops
 * below the lower band is statistically likely to revert toward the mid band. ATR
 * filters out low-volatility chop that would otherwise trigger false entries.
 * When it buys and sells: Buys when price crosses below the lower BB band (oversold).
 * Sells when price crosses back above the mid band (mean reversion complete).
 * When it does NOT work: In strong sustained downtrends where price stays below the
 * lower band — the reversion never comes and the position bleeds. Also underperforms
 * in sharp parabolic pumps (price never returns to mean quickly).
 */

function onUpdate(ctx) {
    // Require 2 closed bars for crossover detection
    const bb1 = ctx.bb(20, 2, 1);
    const bb2 = ctx.bb(20, 2, 2);
    if (bb1 == null || bb2 == null) return null;

    const price = ctx.price;
    const lower1 = bb1.lower;
    const lower2 = bb2.lower;
    const mid1  = bb1.mid;
    const mid2  = bb2.mid;

    // Warm-up guard
    if (lower1 == null || lower2 == null || mid1 == null || mid2 == null) return null;

    // ATR for volatility filter (14-period)
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;

    // Filter out low-volatility regimes — skip if ATR is tiny vs price
    // This prevents entries in choppy low-vol periods
    if (atr / price < 0.01) return null;

    const openOrders = ctx.openOrders();
    const hasPosition = ctx.position > 0;

    // === ENTRY: price crosses below lower band (oversold) ===
    if (!hasPosition && openOrders.length === 0) {
        // Previous bar close was above/below lower band, current bar crosses below
        const prevClose = ctx.closes[1]; // closed bar price
        if (prevClose != null && prevClose > lower2 && price < lower1) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.99,
                type: 'market'
            };
        }
    }

    // === EXIT: price crosses above mid band (mean reversion complete) ===
    if (hasPosition) {
        const prevClose = ctx.closes[1];
        if (prevClose != null && prevClose <= mid2 && price > mid1) {
            return {
                side: 'sell',
                qty: ctx.position,
                type: 'market'
            };
        }
    }

    return null;
}
