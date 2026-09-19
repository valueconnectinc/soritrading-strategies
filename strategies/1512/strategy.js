/*
 * @coinsori-strategy v1
 * name: BB Volume Spike Breakout
 * ex: binance
 * syms: SOLUSDT, DOGEUSDT
 * interval: 4h
 * cash: 10000
 *
 * Bollinger Bands + volume spike entry in confirmed uptrends.
 * Entry: prev close ≤ lower BB + volume spike + price > EMA20 + RSI < 70.
 * Exit: middle BB hit OR RSI>70 OR trend broken | Stop: lower BB × 0.985.
 */

function onUpdate(ctx) {
    var bb     = ctx.bb(20, 2);
    var ema20  = ctx.ema(20);
    var rsi    = ctx.rsi(14);
    var avgVol = ctx.avgVol(20);

    if (bb == null || ema20 == null || rsi == null || avgVol == null || avgVol === 0) return null;

    var lower   = bb.lower;
    var middle  = bb.middle;
    var price   = ctx.price;
    var vol     = ctx.vol;
    var prevClose = ctx.closes[1];
    var volSpike  = vol > avgVol * 1.5;

    if (ctx.position === 0 && !ctx.openOrders?.length) {
        var prevBelowLower = prevClose != null && prevClose <= lower;
        if (prevBelowLower && volSpike && price > ema20 && rsi < 70) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    if (ctx.position > 0) {
        if (rsi > 70 || price < ema20 || price >= middle) {
            return { side: 'sell', qty: ctx.position };
        }
        var stopLevel = lower * 0.985;
        if (price < stopLevel) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
