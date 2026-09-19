/*
 * @coinsori-strategy v1
 * name: RSI Zone Momentum with BB Filter
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI momentum entering on pullbacks. Faster than EMA crossover, avoids
 * chasing extended moves by waiting for RSI to dip into oversold first.
 * BB width acts as a volatility filter — no new trades when volatility
 * is compressing (low BB width), as those setups tend to whipsaw.
 * Why this strategy: RSI entering oversold and turning up catches momentum
 * pulses without needing a full EMA cross. Volume confirms institutional interest.
 * When it buys and sells: Buy when RSI crosses above 40 (recovery from oversold)
 * with above-average volume and BB width > 1.0% (expanding market).
 * Sell when RSI crosses below 55 (momentum weakening).
 * When it does NOT work: In strong parabolic pumps, RSI stays extended and
 * the strategy misses the early part of the move, only entering on pullbacks
 * that may not come. Low-volatility chop produces whipsaws.
 */
function onUpdate(ctx) {
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const rsi_1 = ctx.rsi(14, 1);
    if (rsi_1 == null) return null;

    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volOk = ctx.vol > avgVol;

    // BB width as volatility filter — requires expanding market
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;
    const bbWidth = (bb.upper - bb.lower) / bb.mid;
    // BB width > 1% means market is moving — avoid dead chop
    const volExpanding = bbWidth > 0.01;

    // RSI crosses above 40: recovering from oversold = momentum entry
    const rsiBullCross = rsi_1 <= 40 && rsi > 40;
    // RSI crosses below 55: momentum weakening = exit
    const rsiBearCross = rsi_1 >= 55 && rsi < 55;

    if (ctx.position === 0) {
        if (rsiBullCross && volOk && volExpanding) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        return null;
    }

    if (ctx.position > 0) {
        if (rsiBearCross) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    return null;
}
