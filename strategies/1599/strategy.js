/*
 * @coinsori-strategy v1
 * name: SOL MACD Momentum
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: MACD is smoother than EMA crosses and gives cleaner momentum signals.
 * The 200 SMA filters out trades when SOL is in a base-building phase (no clear trend).
 * When it buys and sells: Buys when MACD crosses above signal line while price is above 200 SMA.
 * Sells when MACD crosses below signal line (momentum shifted).
 * When it does NOT work: In volatile dumps where MACD flips fast — the strategy re-enters
 * at lower prices, compounding losses during sharp corrections.
 */
function onUpdate(ctx) {
    const macd   = ctx.macd(12, 26, 9);
    const macdP1 = ctx.macd(12, 26, 9, 1);
    const sma200 = ctx.sma(200);
    const sma200P1 = ctx.sma(200, 1);

    if (macd == null || macdP1 == null) return null;
    if (sma200 == null || sma200P1 == null) return null;

    const price = ctx.price;
    const prevClose1 = ctx.closes[1];

    const position = ctx.position;

    // === ENTRY: MACD crosses above signal line (prev bar: macd <= signal, current: macd > signal) ===
    const macdCrossUp   = (macdP1.macd <= macdP1.signal && macd.macd > macd.signal);
    // === EXIT: MACD crosses below signal line (prev bar: macd > signal, current: macd <= signal) ===
    const macdCrossDown = (macdP1.macd >  macdP1.signal && macd.macd <= macd.signal);

    const priceAbove200 = (prevClose1 > sma200P1) && (price > sma200);

    if (macdCrossUp && priceAbove200 && position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    if (macdCrossDown && position > 0) {
        return { side: 'sell', qty: position };
    }

    return null;
}
