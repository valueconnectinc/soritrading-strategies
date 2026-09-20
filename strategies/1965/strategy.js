/*
 * @coinsori-strategy v1
 * name: Bollinger Band Volatility Breakout
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Volatility squeezes (BB narrowing) often precede explosive moves.
 * When price breaks above the upper BB band with rising volume, momentum is likely to continue.
 * When it buys and sells: Buys when price closes above upper BB band with above-average volume.
 * Sells when price closes below middle BB band (mean reversion exit).
 * When it does NOT work: In choppy range-bound markets where BB breakouts fail repeatedly.
 * Works best in trending volatility expansion regimes.
 */

function onUpdate(ctx) {
    // BB with standard 20-period, 2 standard deviation bandwidth
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    const upper  = bb.upper;
    const middle = bb.middle;
    const lower  = bb.lower;

    // Volume confirmation: today's volume must exceed the 20-bar average
    const avgVol = ctx.avgVol(20);
    if (avgVol == null || ctx.vol <= avgVol) return null;

    // === ENTRY: Bollinger breakout long ===
    // Price must close above upper band — strong momentum signal
    // We check the PREVIOUS bar to detect the crossover (ago=1 reads closed bar)
    const prevClose = ctx.closes[1];
    if (prevClose != null && prevClose <= upper && ctx.price > upper) {
        // Entry confirmed: price broke above upper band on this bar
        const qty = ctx.cash / ctx.price * 0.90;
        if (qty <= 0) return null;
        return { side: 'buy', qty: qty };
    }

    // === EXIT: mean reversion — price falls back below middle band ===
    // Check if we have a position
    if (ctx.position > 0) {
        const prevClose2 = ctx.closes[1];
        // Exit if previous close was above middle but current price is below
        if (prevClose2 != null && prevClose2 > middle && ctx.price <= middle) {
            return { side: 'sell', qty: ctx.position };
        }
        // Also exit if price drops below lower band (stop loss)
        if (ctx.price < lower) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
