/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Markets oscillate — when price drops far below Bollinger Bands, it
 * tends to bounce back. This strategy fades extremes using RSI as confirmation.
 * When it buys and sells: Buy when price touches lower BB band AND RSI < 30 (oversold).
 * Sell when price touches upper BB band AND RSI > 70 (overbought), or via ATR trailing stop.
 * When it does NOT work: Trending markets — if BTC breaks lower BB and keeps falling,
 * the oversold bounce never comes and the position bleeds.
 */

const BB_PERIOD = 20;
const RSI_PERIOD = 14;
const ATR_PERIOD = 14;
const ATR_MULT_SL = 2.0;   // stop loss: entry price - ATR * 2
const ATR_MULT_TP = 2.5;   // take profit: entry price + ATR * 2.5
const BB_STD = 2;

function onUpdate(ctx) {
    // Need closed bars for all indicators
    const bb = ctx.bb(BB_PERIOD, BB_STD, 2);
    const rsi = ctx.rsi(RSI_PERIOD, 2);
    const atr = ctx.atr(ATR_PERIOD, 2);

    if (bb == null || rsi == null || atr == null) return null;
    if (bb.mid == null || bb.lower == null || bb.upper == null) return null;

    const price = ctx.price;
    const openPos = ctx.position > 0;

    // ---- ENTRY: price at lower BB AND RSI oversold ----
    if (!openPos) {
        // price at or below lower band + RSI confirming oversold
        if (price <= bb.lower && rsi < 30) {
            const qty = (ctx.cash * 0.98) / price;
            return { side: 'buy', qty: qty, type: 'market' };
        }
        return null;
    }

    // ---- EXIT: price at upper BB AND RSI overbought ----
    if (price >= bb.upper && rsi > 70) {
        return { side: 'sell', qty: ctx.position, type: 'market' };
    }

    // ---- STOP LOSS: ATR-based hard stop ----
    const slPrice = ctx.entryPx - atr * ATR_MULT_SL;
    if (price <= slPrice) {
        return { side: 'sell', qty: ctx.position, type: 'market' };
    }

    // ---- TAKE PROFIT: ATR-based target ----
    const tpPrice = ctx.entryPx + atr * ATR_MULT_TP;
    if (price >= tpPrice) {
        return { side: 'sell', qty: ctx.position, type: 'market' };
    }

    return null;
}
