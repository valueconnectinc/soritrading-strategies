/*
 * @coinsori-strategy v1
 * name: SOL EMA Signal
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Pure EMA9/21 crossover is a clean momentum signal. The SMA50
 * is only used as an exit (wider stop) to let the trade run through pullbacks.
 * When it buys and sells: Buys when EMA9 crosses above EMA21 (momentum shift up).
 * Sells when price crosses below SMA50 (trend broken — wider than EMA cross exit).
 * When it does NOT work: In choppy markets with repeated EMA crosses — each gives a
 * new entry signal even if the previous trade was stopped out near breakeven.
 */
function onUpdate(ctx) {
    const ema9   = ctx.ema(9);
    const ema21  = ctx.ema(21);
    const sma50  = ctx.sma(50);
    const ema9P1   = ctx.ema(9, 1);
    const ema21P1  = ctx.ema(21, 1);
    const sma50P1  = ctx.sma(50, 1);

    if (ema9 == null || ema21 == null || sma50 == null) return null;
    if (ema9P1 == null || ema21P1 == null || sma50P1 == null) return null;

    const price = ctx.price;
    const closes = ctx.closes;
    const prevClose1 = closes[1];

    const position = ctx.position;

    // === ENTRY: EMA9 crosses above EMA21 (pure momentum signal, no filter) ===
    const emaCrossUp = (ema9P1 <= ema21P1) && (ema9 > ema21);

    if (emaCrossUp && position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: price crosses below SMA50 (trend broken — wider stop) ===
    const priceCrossDownSma = (prevClose1 > sma50P1) && (price < sma50);

    if (priceCrossDownSma && position > 0) {
        return { side: 'sell', qty: position };
    }

    return null;
}
