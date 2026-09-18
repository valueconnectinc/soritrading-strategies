/*
 * @coinsori-strategy v1
 * name: MACD Crossover Trend — BTCUSDT 1d
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Classic MACD (12,26,9) trend-following on daily BTC. When MACD crosses
 * above its signal line, the trend is turning bullish — enter long. When
 * MACD crosses below signal, the trend is turning bearish — exit.
 * No stops in backtest (shows true drawdown); in live, a 5% hard stop
 * caps losses on gap-downs.
 *
 * When it buys:  MACD crosses above signal line (bullish momentum confirmed).
 * When it sells: MACD crosses below signal line (bearish momentum confirmed).
 *
 * When it does NOT work: in choppy/sideways markets MACD whipsaws — each
 * fake breakout burns capital. Works best in sustained trending periods
 * (clear bull runs or bear trends). Fees matter: 0.1% taker eats into
 * short-lived signals.
 */

function onUpdate(ctx) {
    // MACD: fast=12, slow=26, signal=9 — standard parameters
    const macd  = ctx.macd(12, 26, 9, 0);
    const macd1 = ctx.macd(12, 26, 9, 1);  // previous bar (closed, stable)
    if (macd == null || macd1 == null) return null;
    if (macd.signal == null || macd1.signal == null) return null;

    // ── No position — look for entry ───────────────────────────────────────
    if (ctx.position === 0) {
        // MACD crosses ABOVE signal line (bullish momentum shift)
        // Previous: MACD <= signal. Current: MACD > signal.
        const crossUp = macd1.macd <= macd1.signal && macd.macd > macd.signal;
        if (crossUp) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.995 };
        }
        return null;
    }

    // ── Active long — look for exit ────────────────────────────────────────
    if (ctx.position > 0) {
        // MACD crosses BELOW signal line (bearish momentum shift)
        // Previous: MACD >= signal. Current: MACD < signal.
        const crossDown = macd1.macd >= macd1.signal && macd.macd < macd.signal;
        if (crossDown) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    return null;
}
