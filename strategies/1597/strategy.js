/*
 * @coinsori-strategy v1
 * name: SOL EMA Rider
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: EMA crossover gives the entry signal, but a wider SMA50 exit
 * prevents being stopped out on every pullback — letting winners run through normal retracements.
 * When it buys and sells: Buys when EMA9 crosses above EMA21 AND price above SMA50 (uptrend confirmed).
 * Sells when price crosses below SMA50 (trend genuinely broken, not just a pullback).
 * When it does NOT work: In choppy markets where price oscillates around SMA50 — the strategy
 * enters and exits repeatedly with small losses.
 */
function onUpdate(ctx) {
    const ema9   = ctx.ema(9);
    const ema21  = ctx.ema(21);
    const sma50  = ctx.sma(50);
    const ema9P1  = ctx.ema(9, 1);
    const ema21P1 = ctx.ema(21, 1);
    const sma50P1 = ctx.sma(50, 1);

    if (ema9 == null || ema21 == null || sma50 == null) return null;
    if (ema9P1 == null || ema21P1 == null || sma50P1 == null) return null;

    const price = ctx.price;
    const closes = ctx.closes;
    const prevClose1 = closes[1];

    const position = ctx.position;

    // === ENTRY: EMA9 crosses above EMA21 + price above SMA50 (confirmed uptrend) ===
    const emaCrossUp   = (ema9P1 <= ema21P1) && (ema9 > ema21);
    const priceAboveSma = (prevClose1 > sma50P1) && (price > sma50);

    if (emaCrossUp && priceAboveSma && position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: price crosses below SMA50 (trend genuinely broken — wider stop) ===
    const priceCrossDownSma = (prevClose1 > sma50P1) && (price < sma50);

    if (priceCrossDownSma && position > 0) {
        return { side: 'sell', qty: position };
    }

    return null;
}
