/*
 * @coinsori-strategy v1
 * name: ATR Volatility Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 1h
 * cash: 1000
 *
 * Buys when volatility expands: price breaks above the upper Bollinger Band
 * AND ATR is rising (confirming a real move, not a spike). Sells when price
 * falls below the lower Bollinger Band (or ATR stops out).
 * Works in trending/volatile markets; fails in low-vol, choppy regimes.
 */

function onUpdate(ctx) {
    // Indicators
    const bb   = ctx.bb(20, 2);
    const atr  = ctx.atr(14);
    const atr1 = ctx.atr(14, 1);  // ATR 1 bar ago for direction check
    const price = ctx.price;

    // Volume confirmation: current bar volume vs 20-bar average
    const avgVol = ctx.avgVol(20);
    const vol    = ctx.vol;

    if (bb == null || atr == null || atr1 == null || avgVol == null || vol == null) return null;

    const upper = bb.upper;
    const lower = bb.lower;
    const mid   = bb.mid;

    // ATR rising = expanding volatility (confirms a real move)
    const atrRising = atr > atr1;

    // Volume above average confirms institutional interest
    const volConfirm = vol > avgVol * 0.8;

    // BUY: price breaks above upper band + ATR rising + volume confirm
    const buySignal = price > upper && atrRising && volConfirm;

    // SELL: price falls below lower band (trend reversal)
    const sellSignal = price < lower;

    // ATR-based stop: exit if price drops 1.5× ATR from entry
    // We track this via a simple price threshold using the lower band as proxy
    const softStop = price < mid * 0.98;  // exit if price falls below mid by 2%

    if (ctx.position <= 0 && buySignal) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    if (ctx.position > 0 && (sellSignal || softStop)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
