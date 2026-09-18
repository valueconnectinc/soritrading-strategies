/*
 * @coinsori-strategy v1
 * name: OI Crash Detector + RSI Mean Reversion v3
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI mean-reversion with Binance OI crash detection.
 * Fixes the crash-protection problem (May 2021, Nov 2022) that EMA200
 * alone cannot catch — when OI drops sharply, it signals mass liquidations
 * and forces an immediate exit, regardless of trend filter.
 * Why this: OI collapse is a more reliable crash signal than price-based
 * indicators because it directly measures leverage being wiped out.
 * When it buys: RSI crosses above 30 while price is above EMA200
 * (uptrend confirmed) AND OI is stable/rising (no crash in progress).
 * When it sells: OI drops >15% over one bar (CRASH EXIT — immediate) OR
 * RSI crosses below 70 in downtrend OR ATR 1.5× stop OR 120-bar timeout.
 * When it does NOT work: in slow grinding downtrends where OI erodes
 * gradually (no sharp flush).
 */

function onUpdate(ctx) {
    const state   = ctx.state ?? {};
    const curBar  = ctx.i;
    if (state.lastBarI !== curBar) {
        state.prevRsi  = state.snapRsi  ?? null;
        state.snapRsi  = ctx.rsi(14);
        state.prevOi   = state.snapOi   ?? null;
        state.snapOi   = ctx.binanceOi();
        state.lastBarI = curBar;
        ctx.state = state;
    }

    const ema200 = ctx.ema(200);
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);

    if (ema200 == null || rsi == null || atr == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;
    const entry = ctx.entryPx;

    const rsiNow  = state.snapRsi;
    const rsiPrev = state.prevRsi;
    if (rsiNow == null || rsiPrev == null) return null;

    const rsiCrossUp30 = rsiPrev <= 30 && rsiNow > 30;
    const rsiCrossDn70 = rsiPrev >= 70 && rsiNow < 70;

    const oiNow  = state.snapOi;
    const oiPrev = state.prevOi;
    let oiCrash = false;
    if (oiNow != null && oiPrev != null && oiPrev > 0) {
        const oiChg = (oiNow - oiPrev) / oiPrev;
        oiCrash = oiChg < -0.15;
    }

    const bullTrend = price > ema200;
    const bearTrend  = price < ema200;

    const meanRevBuy = rsiCrossUp30 && bullTrend && !oiCrash;

    if (meanRevBuy && pos === 0) {
        const riskAmt = ctx.cash * 0.02;
        const qty     = riskAmt / atr;
        ctx.log(`BUY  RSI_Bounce  qty=${qty.toFixed(4)}  price=${price}  RSI=${rsi.toFixed(1)}`);
        return { side: 'buy', qty: qty };
    }

    if (oiCrash && pos > 0) {
        const oiChg = (oiNow != null && oiPrev != null && oiPrev > 0)
            ? ((oiNow - oiPrev) / oiPrev * 100).toFixed(1) + '%'
            : 'n/a';
        ctx.log(`SELL OI_CRASH  OI_chg=${oiChg}  price=${price}`);
        return { side: 'sell', qty: pos };
    }

    const trendExit = rsiCrossDn70 && bearTrend;
    const hardStop  = entry > 0 && (entry - price) > atr * 1.5;
    const veryOverbought = rsi >= 80;

    if ((trendExit || hardStop || veryOverbought) && pos > 0) {
        const reason = hardStop ? 'atr-stop' : (veryOverbought ? 'overbought' : 'trend-exit');
        ctx.log(`SELL ${reason}  qty=${pos}  price=${price}  RSI=${rsi.toFixed(1)}`);
        return { side: 'sell', qty: pos };
    }

    const symState  = ctx.symState;
    const entryBar  = symState?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 120) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}
