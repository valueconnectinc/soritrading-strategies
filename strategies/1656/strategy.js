/*
 * @coinsori-strategy v1
 * name: RSI Momentum with SMA Trend Filter
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI momentum zone strategy on SOLUSDT: buy when RSI enters oversold zone
 * while price is above SMA20 (uptrend), sell when price falls below SMA20.
 * SOLUSDT is more trending than ETHUSDT, so a shorter trend filter works better.
 * When it buys and sells: long when RSI < 40 and price > SMA20; exit when
 * RSI > 60 or price crosses below SMA20.
 * When it does NOT work: in choppy SOL markets with no clear trend, RSI
 * oscillates and triggers whipsaws. Also fails when SOL gaps down on news.
 */
function onUpdate(ctx) {
    // Need 20 bars for SMA20
    const sma20_1 = ctx.sma(20, 1);
    if (sma20_1 == null) return null;

    const rsi_0 = ctx.rsi(14);
    const rsi_1 = ctx.rsi(14, 1);
    if (rsi_0 == null || rsi_1 == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    const hasPos = ctx.position > 0;
    const priceAboveSMA = ctx.price > sma20_1;
    const priceBelowSMA = ctx.price < sma20_1;

    // === LONG ENTRY: RSI crosses below 40, price above SMA20 ===
    if (!hasPos) {
        // RSI crosses below 40 in uptrend
        if (rsi_1 >= 40 && rsi_0 < 40 && priceAboveSMA) {
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.99,
                stopPx: ctx.price - 2 * atr
            };
        }
    }

    // === EXIT LONG ===
    if (hasPos) {
        // Trend reversal
        if (priceBelowSMA) {
            return { side: 'sell', qty: ctx.position };
        }
        // RSI overbought
        if (rsi_0 > 70) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
