/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + Stochastic Confirm (AVAXUSDT 4H)
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: On AVAXUSDT 4H, BB mean reversion with dual confirmation (BB + Stochastic)
 * beat benchmarks in 2/3 walk-forward windows (exp 482). AVAXUSDT's range-bound periods
 * create reliable overshoot/undershoot at BB bands — fading them with tight stops works.
 * When it buys and sells: Buy when price reaches the BB lower band AND Stochastic %K < 20
 * (deeply oversold bounce). Sell when price reaches the BB upper band AND Stochastic %K > 80
 * (overbought exit), OR when RSI reaches 65 (profit-taking). ATR stop-loss below entry.
 * When it does NOT work: In strong sustained trends, price can stay at the BB band for days —
 * the strategy keeps getting stopped out. Also fails in low-volatility chop where bands are tight.
 */

function onUpdate(ctx) {
    const bb = ctx.bb(20, 2, 0);
    if (bb == null) return null;

    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;

    const stoch = ctx.stoch(14, 3, 0);
    if (stoch == null) return null;

    const atr = ctx.atr(14, 0);
    if (atr == null) return null;

    const price = ctx.price;
    const position = ctx.position;

    // Entry: price at BB lower band + Stochastic deeply oversold
    if (position === 0 && price <= bb.lower && stoch.k < 20) {
        const stopPx = price - 1.0 * atr;
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            stopPx: stopPx
        };
    }

    // Exit: price at BB upper band + Stochastic overbought, OR RSI profit-taking
    if (position > 0) {
        const stochExit = price >= bb.upper && stoch.k > 80;
        const rsiExit = rsi > 65;
        if (stochExit || rsiExit) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
