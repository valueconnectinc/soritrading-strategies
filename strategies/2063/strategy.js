/*
 * @coinsori-strategy v1
 * name: BB Volatility Breakout + RSI Confirm
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Bollinger Band upper/lower bands are volatility-adjusted support/resistance
 * — more adaptive than Donchian (which failed on SOLUSDT). Price breaking above the upper band
 * signals a strong momentum move; RSI confirms it's not a false spike. ATR sizes the stop-loss.
 * When it buys and sells: Buy when price closes above the BB upper band AND RSI(14) > 50
 * (momentum confirmation). Sell when price closes below the BB lower band AND RSI < 50,
 * OR when RSI reaches 70 (overbought profit-taking). Stop-loss at 1.5× ATR below entry.
 * When it does NOT work: Fails in slow grinding trends where price hugs the band without
 * breaking through — the confirmation filter may miss the early part of the move.
 */

function onUpdate(ctx) {
    // Warm-up guard: need 20 bars for BB
    const bb = ctx.bb(20, 2, 0);
    if (bb == null) return null;

    const rsi = ctx.rsi(14, 0);
    if (rsi == null) return null;

    const atr = ctx.atr(14, 0);
    if (atr == null) return null;

    const price = ctx.price;
    const position = ctx.position;

    // Entry: price breaks above upper band + RSI confirms momentum
    // RSI > 50 = confirmed uptrend, avoids false breakouts
    if (position === 0 && price > bb.upper && rsi > 50) {
        const stopPx = price - 1.5 * atr;
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            stopPx: stopPx
        };
    }

    // Exit: price drops below lower band + RSI weak, OR RSI overbought
    if (position > 0) {
        const rsiExit = rsi > 70; // RSI overbought — take profit
        const bbExit = price < bb.lower && rsi < 50; // Weak momentum exit
        if (rsiExit || bbExit) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
