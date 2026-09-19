/*
 * @coinsori-strategy v1
 * name: Golden Cross Volume Surge
 * ex: binance
 * syms: DOGEUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: Golden cross (SMA50 > SMA200) captures sustained uptrends while
 * volume confirmation filters out false breakouts. Works in both trending and ranging
 * markets — unlike RSI oversold which fires 0 times in a pure bull run.
 * When it buys and sells: Buy when SMA50 crosses above SMA200 AND volume is 1.5x above
 * its 20-bar average (momentum confirmed by participation). Sell on death cross.
 * When it does NOT work: In choppy markets with frequent crosses, it whipsaws.
 * Sideways crypto periods with no clear trend direction will generate losses.
 */

function onUpdate(ctx) {
    // Indicators need warm-up: SMA200 needs 200 bars minimum
    const sma50  = ctx.sma(50, 0);
    const sma50_1 = ctx.sma(50, 1);
    const sma200 = ctx.sma(200, 0);
    const sma200_1 = ctx.sma(200, 1);

    // Guard: not enough bars yet
    if (sma50 == null || sma200 == null || sma50_1 == null || sma200_1 == null) return null;

    // Volume confirmation: current volume must be 1.5x the 20-bar average
    const avgVol = ctx.avgVol(20);
    if (avgVol == null || ctx.vol == null) return null;
    const volOk = ctx.vol >= avgVol * 1.5;

    // Check position state
    if (ctx.position === 0) {
        // No position — look for golden cross + volume surge
        if (sma50_1 <= sma200_1 && sma50 > sma200 && volOk) {
            // Golden cross with volume confirmation — enter
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Have position — look for death cross
        if (sma50_1 >= sma200_1 && sma50 < sma200) {
            // Death cross — exit
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
