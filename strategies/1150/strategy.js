/*
 * @coinsori-strategy v1
 * name: EMA Cross + Fear-Greed Trend
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Trend-following with EMA crossover catches BTC's big
 * directional moves. The 200-EMA ensures we only trade with the major trend,
 * filtering out whipsaws in choppy markets.
 * When it buys and sells: Buys when the 20-EMA crosses above the 50-EMA
 * (golden cross) while price is above the 200-EMA (major trend is up) and
 * Fear & Greed is below 60. Sells on the reverse death cross or a 5% stop.
 * When it does NOT work: In choppy markets with no clear trend, EMA crosses
 * happen frequently and generate whipsaws. Also underperforms in prolonged
 * bear markets where the 200-EMA filter keeps us out of recovery rallies.
 */

function onUpdate(ctx) {
    // --- Macro sentiment filter ---
    const fg = ctx.data('fear_greed');
    if (fg == null) return null;
    if (fg > 60) return null;   // stay out in extreme greed

    // --- EMA values ---
    const ema20Now  = ctx.ema(20, 0);
    const ema20Prev = ctx.ema(20, 1);
    const ema50Now  = ctx.ema(50, 0);
    const ema50Prev = ctx.ema(50, 1);
    const ema200Now = ctx.ema(200, 0);
    if (ema20Now == null || ema20Prev == null ||
        ema50Now == null || ema50Prev == null ||
        ema200Now == null) return null;

    // --- Trend filter: price must be above 200-EMA ---
    const majorTrendUp = ctx.price > ema200Now;

    // --- Entry: 20 EMA crosses above 50 EMA (golden cross) ---
    const goldenCross = ema20Prev <= ema50Prev && ema20Now > ema50Now;

    // --- Exit: 20 EMA crosses below 50 EMA (death cross) ---
    const deathCross = ema20Prev >= ema50Prev && ema20Now < ema50Now;

    if (ctx.position === 0) {
        if (goldenCross && majorTrendUp) {
            const qty = ctx.cash / ctx.price;  // full Kelly sizing
            return { side: 'buy', qty };
        }
    } else {
        // Stop-loss at 5% from entry
        const pctLoss = (ctx.entryPx - ctx.price) / ctx.entryPx;
        if (deathCross || pctLoss >= 0.05) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
