/*
 * @coinsori-strategy v1
 * name: RSI Momentum Reversal
 * ex: binance
 * syms: FTMUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Tests RSI momentum reversal — a different signal family from
 * EMA crossover (tested on MATIC/SUI/ATOM) and Bollinger mean reversion (tested on SUI).
 * RSI momentum reversal buys when RSI recovers FROM oversold (crosses above 40),
 * betting on continued momentum rather than fading the move.
 * When it buys and sells: Buys when RSI crosses above 40 with rising price and
 * above-average volume. Sells when RSI crosses below 60 or hits overbought (>75).
 * When it does NOT work: In strong downtrends where RSI stays oversold for long
 * periods — the "recovery" signal comes too early.
 */
function onUpdate(ctx) {
    const ema20 = ctx.ema(20, 0);
    if (ema20 == null) return null;
    const rsi  = ctx.rsi(14, 0);
    const rsi1 = ctx.rsi(14, 1);
    if (rsi == null || rsi1 == null) return null;
    const atr  = ctx.atr(14, 0);
    const vol  = ctx.vol;
    const avgV = ctx.avgVol(20);
    if (atr == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;

    // Trend filter: only trade when price is above EMA20 (no counter-trend shorts)
    const bullTrend = price > ema20;

    // Volume confirmation
    const volConfirm = avgV != null && vol > avgV * 1.2;

    // === ENTRY: RSI recovers from oversold (crosses above 40) ===
    const rsiRecovery = rsi1 < 40 && rsi >= 40;

    if (rsiRecovery && volConfirm && bullTrend) {
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            type: 'limit',
            price: price,
        };
    }

    // === EXIT LONG ===
    if (pos > 0) {
        // RSI exits overbought zone (crosses below 60)
        const rsiExit = rsi1 > 60 && rsi <= 60;
        // ATR stop: 2.5× ATR from entry
        const entryPx = ctx.entryPx;
        if (entryPx != null && price < entryPx - 2.5 * atr) {
            return { side: 'sell', qty: pos };
        }
        if (rsiExit) {
            return { side: 'sell', qty: pos };
        }
        // Hard exit at RSI overbought (take profit)
        if (rsi > 80) {
            return { side: 'sell', qty: pos };
        }
        // Trend exit: price drops below EMA20
        if (price < ema20) {
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
