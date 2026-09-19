/*
 * @coinsori-strategy v1
 * name: EMA-RSI Momentum
 * ex: binance
 * syms: NEARUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossover captures trend shifts early; RSI filters out
 * noisy moves in overbought/oversold zones so we only trade clean momentum.
 * When it buys and sells: Buys when fast EMA crosses above slow EMA AND RSI is
 * below 70 (not overheated). Sells when fast EMA crosses below slow EMA OR RSI
 * hits 80 (taking profit in overbought).
 * When it does NOT work: Choppy range-bound markets where EMAs repeatedly cross
 * — each cross triggers a trade and fees erode the account.
 */
function onUpdate(ctx) {
    const emaFast = ctx.ema(9);
    const emaSlow = ctx.ema(21);
    const rsi = ctx.rsi(14);
    const prevFast = ctx.ema(9, 1);
    const prevSlow = ctx.ema(21, 1);
    const prevRsi = ctx.rsi(14, 1);

    if (emaFast == null || emaSlow == null || rsi == null) return null;
    if (prevFast == null || prevSlow == null || prevRsi == null) return null;

    // BUY: fast EMA crosses above slow EMA, RSI not yet overbought
    const bullishCross = prevFast <= prevSlow && emaFast > emaSlow;
    // SELL: fast EMA crosses below slow EMA, or RSI reaches 80 (profit-taking)
    const bearishCross = prevFast >= prevSlow && emaFast < emaSlow;
    const rsiOverbought = rsi >= 80;

    if (ctx.position <= 0 && bullishCross && rsi < 70) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    if (ctx.position > 0 && (bearishCross || rsiOverbought)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
