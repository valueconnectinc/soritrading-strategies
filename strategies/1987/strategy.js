/*
 * @coinsori-strategy v1
 * name: ETH ATR Volatility Breakout
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 1000
 *
 * ATR volatility breakout — buys when price breaks above a 20-bar high with ATR
 * confirming the move has enough volatility, sells when price drops below a trailing
 * ATR-based stop or EMA trend flips.
 * Does not work in choppy markets with false breakouts and whipsaws.
 */
function onUpdate(ctx) {
    const atr = ctx.atr(14, 0);
    const atr1 = ctx.atr(14, 1);
    if (atr == null || atr1 == null) return null;

    const high20_1 = ctx.high(20, 1);  // previous bar's 20-bar high
    const ema20_1 = ctx.ema(20, 1);
    const ema20_2 = ctx.ema(20, 2);
    const ema20_0 = ctx.ema(20, 0);
    if (high20_1 == null || ema20_1 == null || ema20_2 == null || ema20_0 == null) return null;

    const price = ctx.price;
    const position = ctx.position;

    // === TREND: EMA 20 rising = uptrend ===
    const uptrend = ema20_1 < ema20_0;

    // === ENTRY: price breaks above 20-bar high, ATR confirming volatility ===
    // ATR widening = volatility increasing — avoid low-vol consolidation breaks
    const atrRising = atr > atr1;
    const breakout = price > high20_1;

    if (!position && breakout && atrRising && uptrend) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: price falls below EMA 20 (trend flip) or drops 2x ATR from peak ===
    if (position) {
        const trendFlip = price < ema20_0;
        // Simple trailing stop: if price dropped more than 2*ATR from the entry
        const entryPx = ctx.entryPx;
        const atrTrail = price < entryPx - 2 * atr;

        if (trendFlip || atrTrail) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
