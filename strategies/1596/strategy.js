/*
 * @coinsori-strategy v1
 * name: SOL EMA Momentum
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: EMA crossover is a classic trend signal — fast EMA crossing above slow EMA
 * shows building momentum. Adding a longer SMA filter keeps us out of choppy, directionless markets.
 * When it buys and sells: Buys when EMA9 crosses above EMA21 AND price is above SMA50 (confirming uptrend).
 * Sells when EMA9 crosses below EMA21 (momentum shifted).
 * When it does NOT work: In volatile dumps/rallies with fast EMA whipsaw, and when price stays
 * stuck around SMA50 (no clear trend) — the strategy flips repeatedly.
 */

function onUpdate(ctx) {
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const sma50 = ctx.sma(50);
    const ema9P1  = ctx.ema(9, 1);
    const ema21P1 = ctx.ema(21, 1);
    const sma50P1 = ctx.sma(50, 1);

    // Warm-up guards
    if (ema9 == null || ema21 == null || sma50 == null) return null;
    if (ema9P1 == null || ema21P1 == null || sma50P1 == null) return null;

    const price = ctx.price;
    const closes = ctx.closes;
    const prevClose1 = closes[1]; // previous bar close

    const position = ctx.position;

    // === ENTRY: EMA9 crosses above EMA21 AND price above SMA50 (uptrend confirmed) ===
    const emaCrossUp = (ema9P1 <= ema21P1) && (ema9 > ema21);
    const priceAboveSma = (prevClose1 > sma50P1) && (price > sma50);

    if (emaCrossUp && priceAboveSma && position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: EMA9 crosses below EMA21 (momentum shifted) ===
    const emaCrossDown = (ema9P1 > ema21P1) && (ema9 <= ema21);

    if (emaCrossDown && position > 0) {
        return { side: 'sell', qty: position };
    }

    return null;
}
