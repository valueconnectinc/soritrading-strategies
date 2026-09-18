/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + Fear-Greed
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: BTC regularly overshoots to the downside during fear-driven
 * selloffs, then均值-reverts to the moving average. Buying at the lower Bollinger
 * Band when RSI is oversold captures those flushes before the snap-back.
 * When it buys and sells: Buys when price touches the lower Bollinger Band(20,2)
 * AND RSI(14) is below 35 (oversold), while above the 200-EMA (trend is up).
 * Fear & Greed must be below 60 so we don't buy in a greed-fuelled crash.
 * Sells at the middle band (SMA 20) or a 5% stop, whichever hits first.
 * When it does NOT work: In strong downtrends price stays at the lower band
 * for weeks — this strategy catches falling knives. Also fails when RSI
 * never reaches 35 (low-volatility regimes).
 */

function onUpdate(ctx) {
    // --- Macro sentiment filter ---
    const fg = ctx.data('fear_greed');
    if (fg == null) return null;   // no data yet, skip
    if (fg > 60) return null;      // extreme greed = don't buy

    // --- Indicators ---
    const bb  = ctx.bb(20, 2, 0);
    const rsi = ctx.rsi(14, 0);
    const sma200 = ctx.sma(200, 0);
    if (bb == null || rsi == null || sma200 == null) return null;

    const { lower, mid } = bb;

    // Trend filter: only trade when price is above the 200-EMA
    const aboveTrend = ctx.price > sma200;

    // Entry: price at/below lower band + RSI oversold + trend up
    // We check previous bar to confirm the touch (price crossed below lower)
    const bbPrev = ctx.bb(20, 2, 1);
    if (bbPrev == null) return null;
    const prevAboveLower = bbPrev.lower < ctx.closes[1];  // prev close was above lower band
    const nowAtLower     = ctx.price <= lower;              // current price at/below lower band

    const rsiOversold = rsi < 35;
    const bbTouched  = prevAboveLower && nowAtLower;

    if (ctx.position === 0) {
        if (bbTouched && rsiOversold && aboveTrend) {
            // Position sizing: risk 5% of cash, stop is 5% below entry
            // qty = (0.05 * cash) / (0.05 * price) = cash / price
            const qty = ctx.cash / ctx.price;
            return { side: 'buy', qty };
        }
    } else {
        // Exit: price reached middle band (SMA 20) OR 5% stop-loss
        const atMidBand = ctx.price >= mid;
        const pctLoss   = (ctx.entryPx - ctx.price) / ctx.entryPx;
        const stopHit   = pctLoss >= 0.05;

        if (atMidBand || stopHit) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
