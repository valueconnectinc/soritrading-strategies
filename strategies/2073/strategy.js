/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion 1H
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: BTCUSDT frequently overshoots and reverts — RSI below 30
 * historically precedes bounces. The SMA-200 filter keeps us on the right side
 * of the major trend, avoiding "catching a falling knife" in downtrends.
 * When it buys and sells: Buy when RSI crosses below 30 AND price is above
 * SMA-200 (bullish bias). Sell when RSI crosses above 70 OR after a 10% gain.
 * When it does NOT work: In strong sustained trends BTC stays overbought/oversold
 * for weeks — the strategy exits too early and misses the bulk of the move.
 */

function onUpdate(ctx) {
    const rsi = ctx.rsi(14);
    const sma200 = ctx.sma(200);
    if (rsi == null || sma200 == null) return null;

    // Previous bar values for crossover detection
    const rsi1 = ctx.rsi(14, 1);
    const price1 = ctx.price > 0 ? ctx.price : null;
    const closes1 = ctx.closes[1];
    const closes2 = ctx.closes[2];

    // ── ENTRY: RSI oversold + price above SMA-200 (bullish regime) ──
    // RSI crossed below 30 on the previous bar (1), now either holds or dips more
    // We enter on the next bar to confirm the bounce attempt
    if (ctx.position === 0 && rsi1 !== null && rsi1 < 30 && rsi > 0 && ctx.price > sma200) {
        // Buy with 99% of available cash
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── EXIT: multiple targets ──
    if (ctx.position > 0) {
        const entryReturn = (ctx.price - ctx.entryPx) / ctx.entryPx;

        // Take profit: RSI overbought OR 8% gain (whichever comes first)
        if (rsi > 70 || entryReturn >= 0.08) {
            return { side: 'sell', qty: ctx.position };
        }

        // Stop loss: RSI still suppressed + price falls further below SMA-200
        // If price drops below SMA-200, trend has flipped — exit
        if (ctx.price < sma200) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
