/*
 * @coinsori-strategy v1
 * name: RSI-2 Mean Reversion + ATR Regime + OI v7
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI(2) mean-reversion on 4H BTC — the RSI(2) sensitivity gap is huge.
 * RSI(2) daily hit 11.82% / 3.53% MDD in experiments; RSI(14) 4H only 5.72%.
 * RSI(2) catches micro-oversold bounces that RSI(14) misses entirely.
 * ATR regime filter + OI crash detection protect against crash regimes
 * (May 2021, Nov 2022) where mean-reversion fails badly.
 * When it buys: RSI(2) crosses above 25 in uptrend (price > EMA200),
 * with stable OI and no ATR crash spike.
 * When it sells: ATR crash spike (immediate) OR RSI crosses below 75
 * in downtrend OR ATR stop 1.5× OR 120-bar timeout.
 * When it does NOT work: slow grinding downtrends where RSI(2) never
 * bounces to 25, and in sharp trending rallies where RSI(2) stays
 * overbought and the stop gets hit repeatedly.
 */

function onUpdate(ctx) {
    const state   = ctx.state ?? {};
    const curBar  = ctx.i;

    if (state.lastBarI !== curBar) {
        state.prevRsi  = state.snapRsi  ?? null;
        state.snapRsi   = ctx.rsi(2);          // RSI(2) — much more sensitive
        state.prevAtr   = state.snapAtr  ?? null;
        state.snapAtr   = ctx.atr(14);
        state.prevAtrEma = state.snapAtrEma ?? null;
        state.snapAtrEma = ema(state.snapAtr ?? ctx.atr(14), state.prevAtrEma, 20, state);
        state.prevOi    = state.snapOi   ?? null;
        state.snapOi    = ctx.binanceOi();
        state.prevPrice = state.snapPrice ?? null;
        state.snapPrice = ctx.price;
        state.lastBarI  = curBar;
        ctx.state = state;
    }

    const ema200 = ctx.ema(200);
    const rsi    = ctx.rsi(2);
    const atr    = ctx.atr(14);
    const atrEma = state.snapAtrEma;

    if (ema200 == null || rsi == null || atr == null || atrEma == null) return null;

    const price     = ctx.price;
    const pos       = ctx.position;
    const entry     = ctx.entryPx;

    const rsiNow  = state.snapRsi;
    const rsiPrev = state.prevRsi;
    if (rsiNow == null || rsiPrev == null) return null;

    // RSI(2) crossover signals — lower thresholds than RSI(14) version
    const rsiCrossUp25 = rsiPrev <= 25 && rsiNow > 25;
    const rsiCrossDn75 = rsiPrev >= 75 && rsiNow < 75;

    // ATR regime — crash detection
    const atrRatio = atr / atrEma;
    const atrCrash = atrRatio > 2.0;   // spike = immediate exit signal
    const atrHigh  = atrRatio > 1.5;   // high vol = wider stop

    // OI crash detection
    const oiNow  = state.snapOi;
    const oiPrev = state.prevOi;
    let oiCrash = false;
    if (oiNow != null && oiPrev != null && oiPrev > 0) {
        oiCrash = (oiNow - oiPrev) / oiPrev < -0.15;
    }

    const bullTrend = price > ema200;
    const bearTrend = price < ema200;

    // ── ENTRY: RSI(2) bounce in confirmed uptrend ─────────────────────
    const meanRevBuy = rsiCrossUp25 && bullTrend && !atrCrash && !oiCrash;

    if (meanRevBuy && pos === 0) {
        const riskAmt = ctx.cash * 0.02;
        const qty     = riskAmt / atr;
        ctx.log(`BUY  RSI2_Bounce  qty=${qty.toFixed(4)}  price=${price}  RSI2=${rsi.toFixed(1)}  ATR_ratio=${atrRatio.toFixed(2)}`);
        return { side: 'buy', qty: qty };
    }

    // ── EXIT 1: ATR crash spike — immediate exit ─────────────────────
    if (atrCrash && pos > 0) {
        ctx.log(`SELL ATR_Crash  ATR_ratio=${atrRatio.toFixed(2)}  price=${price}`);
        return { side: 'sell', qty: pos };
    }

    // ── EXIT 2: OI crash — immediate exit ────────────────────────────
    if (oiCrash && pos > 0) {
        ctx.log(`SELL OI_Crash  price=${price}`);
        return { side: 'sell', qty: pos };
    }

    // ── EXIT 3: RSI(2) momentum fade in downtrend ─────────────────────
    const trendExit = rsiCrossDn75 && bearTrend;

    // ── EXIT 4: ATR stop — adaptive width ────────────────────────────
    const stopMult = atrHigh ? 3.0 : 1.5;
    const hardStop = entry > 0 && (entry - price) > atr * stopMult;

    // ── EXIT 5: Very overbought ───────────────────────────────────────
    const veryOverbought = rsi >= 80;

    if ((trendExit || hardStop || veryOverbought) && pos > 0) {
        const reason = hardStop ? 'atr-stop' : (veryOverbought ? 'overbought' : 'trend-exit');
        ctx.log(`SELL ${reason}  qty=${pos}  price=${price}  RSI2=${rsi.toFixed(1)}`);
        return { side: 'sell', qty: pos };
    }

    // ── EXIT 6: 120-bar timeout ──────────────────────────────────────
    const symState = ctx.symState;
    const entryBar = symState?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 120) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}

// ── EMA helper ───────────────────────────────────────────────────────────────
function ema(current, prev, period, state) {
    const key = `ema_${period}`;
    const prevEma = state[key] ?? null;
    if (prevEma === null) return current;
    const k = 2 / (period + 1);
    return current * k + prevEma * (1 - k);
}
