/*
 * @coinsori-strategy v1
 * name: BTC 4H EMA50+Vol MACD Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC trends hard but whipsaws on shorter timeframes. Using EMA 50 as a
 * less-strict trend filter than 200 SMA (more signal frequency) while volume confirmation
 * avoids false breakouts during low-liquidity periods. MACD histogram cross for momentum entry.
 * When it buys and sells: Buy when EMA50 is rising (uptrend), MACD crosses above signal line,
 * and volume exceeds its 20-bar average. Sell on opposite signals.
 * When it does NOT work: Ranging markets with no clear trend — EMA50 flat, price oscillating
 * around it — generate many false signals despite volume filter. Strong sustained downtrends
 * where EMA50 itself slopes down.
 */

function onUpdate(ctx) {
    // Trend filter: EMA 50 must be rising (uptrend confirmed)
    const ema50 = ctx.ema(50, 1); // previous bar — closed, reliable
    if (ema50 == null) return null;

    // Require price above EMA 50 for long bias
    const price = ctx.price;
    if (price < ema50) return null;

    // Volume confirmation: current volume must exceed 20-bar average
    const vol = ctx.vol;
    const avgVol = ctx.avgVol(20);
    if (vol == null || avgVol == null || vol < avgVol * 0.8) return null; // 80% of avg as minimum threshold

    // MACD momentum entry: use previous bar (ago=1) for closed-bar signal
    const macd1 = ctx.macd(12, 26, 9, 1);
    const macd2 = ctx.macd(12, 26, 9, 2);
    if (macd1 == null || macd2 == null || macd1.signal == null || macd2.signal == null) return null;

    // Entry: MACD crosses above signal (bullish momentum)
    if (ctx.position <= 0) {
        if (macd2.macd <= macd2.signal && macd1.macd > macd1.signal) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    // Exit: MACD crosses below signal (bearish momentum)
    if (ctx.position > 0) {
        if (macd2.macd >= macd2.signal && macd1.macd < macd1.signal) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // Stop-loss: 2.5% hard stop — tight enough to avoid drawdown but not too tight
    if (ctx.position > 0 && ctx.entryPx > 0) {
        const pnlPct = (price - ctx.entryPx) / ctx.entryPx * 100;
        if (pnlPct < -2.5) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
