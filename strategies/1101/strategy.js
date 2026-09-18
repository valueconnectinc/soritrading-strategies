/*
 * @coinsori-strategy v1
 * name: Dual-Engine RSI + ATR Regime Filter v5
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Dual-engine strategy: combines RSI mean-reversion with ATR-regime filtering
 * and a trend-following component. The original 1092 (RSI+OI) beat buy-hold
 * in the bull window (+22% vs 7.7%) but lost badly in bear-swing (-16% vs +44% bench)
 * because it had no trend-following leg. This version adds two improvements:
 * 1. ATR-regime filter replaces OI (more stable, available every bar)
 * 2. Trend-following entries when price is far from EMA200 in a confirmed trend
 * Why this: ATR ratio detects crash regimes better than fixed thresholds because
 * it adapts to the current market's own volatility baseline.
 * When it buys: RSI crosses above 30 in uptrend (bull bounce) OR
 * price breaks 5% below EMA200 in downtrend (capitulation buy).
 * When it sells: RSI crosses below 60 in uptrend (momentum fade) OR
 * ATR ratio spikes >2.0 (crash exit) OR ATR stop hit.
 * When it does NOT work: in slow grinding downtrends where ATR gradually rises
 * without a sharp spike, and in ranging markets where both signals fire often.
 */

function onUpdate(ctx) {
    const state   = ctx.state ?? {};
    const curBar  = ctx.i;

    if (state.lastBarI !== curBar) {
        state.prevRsi     = state.snapRsi     ?? null;
        state.snapRsi     = ctx.rsi(14);
        state.prevAtr     = state.snapAtr     ?? null;
        state.snapAtr     = ctx.atr(14);
        state.prevAtrEma  = state.snapAtrEma  ?? null;
        state.snapAtrEma  = ema(state.snapAtr ?? ctx.atr(14), state.prevAtrEma, 20, state);
        state.lastBarI    = curBar;
        ctx.state = state;
    }

    const ema200  = ctx.ema(200);
    const rsi     = ctx.rsi(14);
    const atr     = ctx.atr(14);
    const atrEma  = state.snapAtrEma;

    if (ema200 == null || rsi == null || atr == null || atrEma == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;
    const entry = ctx.entryPx;

    const rsiNow  = state.snapRsi;
    const rsiPrev = state.prevRsi;
    if (rsiNow == null || rsiPrev == null) return null;

    const rsiCrossUp30 = rsiPrev <= 30 && rsiNow > 30;
    const rsiCrossDn60 = rsiPrev >= 60 && rsiNow < 60;

    // ATR regime: spike above 2x its EMA = crash regime (high volatility)
    const atrRatio  = atr / atrEma;
    const atrCrash  = atrRatio > 2.0;
    const atrHigh   = atrRatio > 1.5;   // elevated vol: wider stop only

    const bullTrend = price > ema200;
    const bearTrend = price < ema200;

    // Distance from EMA200 as % — signals how extended the move is
    const emaDistPct = (price - ema200) / ema200 * 100;

    // ── ENTRY 1: RSI oversold bounce in confirmed uptrend ─────────────
    const meanRevBuy = rsiCrossUp30 && bullTrend && !atrCrash;

    // ── ENTRY 2: Capitulation buy — price crashed far below EMA200 ─────
    // 5% below EMA200 in a downtrend is a capitulation signal (fear extreme)
    const capitulationBuy = bearTrend && emaDistPct < -5 && rsi < 40 && !atrCrash;

    if ((meanRevBuy || capitulationBuy) && pos === 0) {
        const riskAmt = ctx.cash * 0.02;
        const qty     = riskAmt / atr;
        const reason  = meanRevBuy ? 'RSI_Bounce' : 'Capitulation';
        ctx.log(`BUY  ${reason}  qty=${qty.toFixed(4)}  price=${price}  RSI=${rsi.toFixed(1)}  ATR_ratio=${atrRatio.toFixed(2)}`);
        return { side: 'buy', qty: qty };
    }

    // ── EXIT 1: ATR crash spike — immediate exit ──────────────────────
    if (atrCrash && pos > 0) {
        ctx.log(`SELL ATR_Crash  ATR_ratio=${atrRatio.toFixed(2)}  price=${price}`);
        return { side: 'sell', qty: pos };
    }

    // ── EXIT 2: RSI momentum fade in uptrend ──────────────────────────
    const trendExit = rsiCrossDn60 && bullTrend;

    // ── EXIT 3: ATR stop — adaptive width based on regime ──────────────
    const stopMult = atrHigh ? 3.0 : 1.5;
    const hardStop = entry > 0 && (entry - price) > atr * stopMult;

    // ── EXIT 4: Very overbought ─────────────────────────────────────────
    const veryOverbought = rsi >= 75;

    if ((trendExit || hardStop || veryOverbought) && pos > 0) {
        const reason = hardStop ? 'atr-stop' : (veryOverbought ? 'overbought' : 'trend-exit');
        ctx.log(`SELL ${reason}  qty=${pos}  price=${price}  RSI=${rsi.toFixed(1)}`);
        return { side: 'sell', qty: pos };
    }

    // ── EXIT 5: 120-bar timeout ─────────────────────────────────────────
    const symState = ctx.symState;
    const entryBar = symState?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 120) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}

// ── EMA helper (inlined, no external deps) ───────────────────────────────────
function ema(current, prev, period, state) {
    const key = `ema_${period}`;
    const prevEma = state[key] ?? null;
    if (prevEma === null) return current;
    const k = 2 / (period + 1);
    return current * k + prevEma * (1 - k);
}
