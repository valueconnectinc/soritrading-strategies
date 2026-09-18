/*
 * @coinsori-strategy v1
 * name: RSI-50 + Fear-Greed Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: BTC trends hard after RSI oversold flushes, but entering
 * during extreme greed cycles is the classic trap. By combining RSI momentum
 * signals with Fear & Greed as a regime filter, we avoid chasing tops and
 * instead enter when the market is fearful but turning.
 * When it buys and sells: Buys when RSI(14) crosses above 50 on 1h while
 * Fear & Greed is below 60 (not extreme greed). Sells when RSI crosses back
 * below 50 or a 5% stop-loss triggers.
 * When it does NOT work: Ranges in low-volatility chop — RSI oscillates around
 * 50 generating whipsaws. Also fails in prolonged greed bubbles where the
 * filter keeps us out of large moves.
 */

function onUpdate(ctx) {
    // --- Macro sentiment filter: stay out when market is extremely greedy ---
    const fg = ctx.data('fear_greed');
    if (fg == null) return null;   // no data yet, skip
    if (fg > 60) return null;      // extreme greed = don't buy

    // --- Primary signal: RSI(14) on 1h crosses above 50 ---
    const rsiNow  = ctx.rsi(14, 0);
    const rsiPrev = ctx.rsi(14, 1);
    if (rsiNow == null || rsiPrev == null) return null;

    // RSI crossover above 50 = short-term bullish momentum confirmed
    const rsiBullish = rsiPrev <= 50 && rsiNow > 50;

    // --- Position management ---
    if (ctx.position === 0) {
        // No position — look for entry
        if (rsiBullish) {
            // Full Kelly sizing: risk 5% of cash, stop is 5% below entry
            // qty = risk_usd / stop_distance_per_coin = (0.05 * cash) / (0.05 * price) = cash / price
            const qty = ctx.cash / ctx.price;
            return { side: 'buy', qty };
        }
    } else {
        // Have a position — look for exit
        // Exit 1: RSI(14) crosses back below 50 (momentum lost)
        const rsiBearish = rsiPrev >= 50 && rsiNow < 50;

        // Exit 2: Stop-loss at 5% from entry
        // Long position: price dropped 5% from entry = (entryPx - price) / entryPx >= 0.05
        const pctLoss = (ctx.entryPx - ctx.price) / ctx.entryPx;
        const stopHit = pctLoss >= 0.05;

        if (rsiBearish || stopHit) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
