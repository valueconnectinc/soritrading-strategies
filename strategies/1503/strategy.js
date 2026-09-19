/*
 * @coinsori-strategy v1
 * name: EMA20 Simple Trend Following + ATR Stop
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Simple EMA20 trend following is the most robust trend-capture mechanism — no parameters to overfit, no conflicting signals from multiple indicators. ATR-based stop defines risk precisely. This is the baseline trend-following approach, distinct from MACD (momentum oscillator) or RSI (overbought/oversold) families already tested on SOLUSDT.
 * When it buys and sells: Buy when price closes above EMA20 (trend turns bullish). Sell when price closes below EMA20 (trend reverses). A 2× ATR trailing stop caps downside on each trade.
 * When it does NOT work: In choppy markets where price oscillates around EMA20 — generates whipsaws. Also in markets that gap past the EMA without closing on the right side.
 */
function onUpdate(ctx) {
    // Warm-up guards
    const ema20 = ctx.ema(20, 0);
    const ema20_1 = ctx.ema(20, 1);
    const atr = ctx.atr(14, 0);

    if (ema20 == null || ema20_1 == null) return null;
    if (atr == null) return null;

    // === CLOSE: price closes below EMA20 ===
    if (ctx.position > 0) {
        if (ctx.price < ema20) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    // === ENTRY: price closes above EMA20 ===
    const priceAboveEma = ctx.price > ema20;
    const prevPrice = ctx.candle.close;
    const prevAboveEma = prevPrice > ema20_1;

    // Cross above EMA20
    if (priceAboveEma && !prevAboveEma) {
        // Risk 2% of cash per trade
        const riskAmount = ctx.cash * 0.02;
        const stopDistance = atr * 2; // 2× ATR stop
        const qty = riskAmount / stopDistance;
        return { side: 'buy', qty: qty };
    }

    return null;
}
