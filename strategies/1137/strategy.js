/*
 * @coinsori-strategy v1
 * name: Mean Reversion + EMA200 Trend Filter
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Combines RSI oversold mean reversion with an EMA200 trend filter.
 * Buys when RSI < 35 AND price is above EMA200 (major trend bullish,
 * minor dip = opportunity). Sells when RSI > 55 OR price crosses
 * below EMA200 (trend broken).
 * When it does NOT work: in sharp one-directional crashes (March 2020,
 * Nov 2022) RSI stays oversold for weeks — the trend filter fails to
 * protect against extended drawdowns.
 */

function onUpdate(ctx) {
    const rsi    = ctx.rsi(14);
    const ema200 = ctx.ema(200);
    const price  = ctx.price;
    if (rsi == null || ema200 == null || price == null) return null;

    // Trend filter: price must be above EMA200 (major uptrend)
    const uptrend = price > ema200;

    // ── ENTRY: RSI oversold + price above EMA200 ──
    // RSI < 35 = deeply oversold, expect a bounce
    if (rsi < 35 && uptrend && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── EXIT: RSI normalized OR trend broken ──
    // Sell when RSI recovers above 55 (bounce complete) or price drops below EMA200
    const rsiNormalized = rsi > 55;
    const trendBroken   = price < ema200;
    if ((rsiNormalized || trendBroken) && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
