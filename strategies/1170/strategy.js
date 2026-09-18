/*
 * @coinsori-strategy v1
 * name: MACD Trend + EMA200 Filter — BTCUSDT 1d
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * MACD crossover trend-following, but ONLY when the long-term trend is
 * bullish (price above 200-day EMA). Pure MACD on daily BTC lost -63%
 * in backtest because it bought into the 2022 bear market. Adding the
 * EMA200 filter keeps the strategy in cash during major downtrends.
 *
 * When it buys:  price > EMA200 AND MACD crosses above signal line.
 * When it sells: MACD crosses below signal line (no filter — exit fast
 *                 on trend reversal regardless of where price is).
 *
 * When it does NOT work: in volatile sideways markets where price hovers
 * around EMA200, the filter flips on/off and MACD still whipsaws — many
 * small losses before a real trend. Misses the early bottom if price
 * hasn't recovered above EMA200 yet.
 */

function onUpdate(ctx) {
    const macd  = ctx.macd(12, 26, 9, 0);
    const macd1 = ctx.macd(12, 26, 9, 1);
    if (macd == null || macd1 == null) return null;
    if (macd.signal == null || macd1.signal == null) return null;

    // EMA200: primary trend filter — only trade when BTC is in a bull phase
    const ema200 = ctx.ema(200, 0);
    if (ema200 == null) return null;

    const aboveTrend = ctx.price > ema200;

    // ── No position — look for entry ──────────────────────────────────────
    if (ctx.position === 0) {
        // MACD bullish crossover AND price is above EMA200 (confirmed uptrend)
        const crossUp = macd1.macd <= macd1.signal && macd.macd > macd.signal;
        if (crossUp && aboveTrend) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.995 };
        }
        return null;
    }

    // ── Active long — exit on MACD bearish crossover ───────────────────────
    if (ctx.position > 0) {
        // Exit immediately when MACD turns bearish — no filter needed for exits
        const crossDown = macd1.macd >= macd1.signal && macd.macd < macd.signal;
        if (crossDown) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    return null;
}
