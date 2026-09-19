/*
 * @coinsori-strategy v1
 * name: RSI Regime Filter v2
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: RSI captures情绪极端点 but 4H oversold alone catches falling knives
 * in downtrends. Adding a 200 SMA trend filter eliminates trades against the major trend —
 * only buying when price is above the 200 SMA filters out the worst bear market entries.
 * When it buys and sells: Buys when RSI < 30 (deep oversold) + price > 200 SMA + price
 * touches lower Bollinger Band. Sells when RSI > 65 OR price closes below 20 SMA.
 * When it does NOT work: In strong uptrends RSI rarely drops below 30, so the strategy
 * sits out the best parts of bull markets and misses the initial recovery rally.
 */
function onUpdate(ctx) {
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    const sma20 = ctx.sma(20);
    if (sma20 == null) return null;

    const sma200 = ctx.sma(200);
    if (sma200 == null) return null;

    const price = ctx.price;

    // --- No position: look for entry ---
    if (ctx.position === 0) {
        // BUY: RSI deeply oversold (< 30) + price above 200 SMA (major trend up)
        //       + price at or below lower BB (mean reversion entry)
        if (rsi < 30 && price > sma200 && price <= bb.lower) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
        return null;
    }

    // --- Have long position: exit rules ---
    if (ctx.position > 0) {
        // Sell on RSI overbought (> 65)
        if (rsi > 65) {
            return { side: 'sell', qty: ctx.position };
        }
        // Sell if price closes below 20 SMA (trend broken)
        if (price < sma20) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    return null;
}
