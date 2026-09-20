/*
 * @coinsori-strategy v1
 * name: Funding Rate + OI Sentiment Momentum v5 (BB Momentum)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Funding rates and OI reveal crowd positioning. This version
 * uses Bollinger Band breakouts as the primary signal (more reactive than EMA cross)
 * with RSI confirmation and volume filter. ATR stop manages risk.
 * When it buys and sells: Long when price closes above BB upper band + RSI > 50 + vol spike.
 * Short when price closes below BB lower band + RSI < 50 + vol spike.
 * Exit on BB middle band touch, ATR stop, or 24-bar time max.
 * When it does NOT work: In strong trends where BB breakouts are false signals.
 */
const ATR_PER   = 14;
const ATR_MUL   = 2.5;
const BB_PER    = 20;
const BB_K      = 2;
const RSI_PER   = 14;
const VOL_AVG    = 20;
const VOL_TRIG  = 1.2;

let state = { inPos: false, side: null, entryPx: 0, barsIn: 0 };

function onUpdate(ctx) {
    const bb    = ctx.bb(BB_PER, BB_K);
    const atr    = ctx.atr(ATR_PER);
    const rsi    = ctx.rsi(RSI_PER);
    const avgVol = ctx.avgVol(VOL_AVG);
    if (bb == null || atr == null || rsi == null || avgVol == null) return null;

    const price    = ctx.price;
    const upper    = bb.upper;
    const middle   = bb.middle;
    const lower    = bb.lower;
    const volRatio = ctx.vol / avgVol;

    // Previous bar's close for breakout detection
    const closes   = ctx.closes;
    const prevClose = closes && closes.length > 1 ? closes[1] : price;
    const prevUpper = ctx.high(BB_PER);  // rough proxy
    // Better: use previous bar's BB
    const bb1      = ctx.bb(BB_PER, BB_K, 1);
    const upper1   = bb1 ? bb1.upper : upper;
    const lower1   = bb1 ? bb1.lower : lower;

    // Breakout: previous bar was inside/near BB, current price breaks out
    const aboveUpper  = price > upper  && prevClose <= upper1;
    const belowLower = price < lower  && prevClose >= lower1;

    // RSI confirmation: trend direction
    const rsiBull = rsi > 50;
    const rsiBear = rsi < 50;

    // Volume confirmation (OI proxy)
    const volConfirm = volRatio > VOL_TRIG;

    // Size: risk ~250 USDT per trade
    const riskQty = 250 / (atr * price);

    // ── Entry ──────────────────────────────────────────────────────
    if (!state.inPos) {
        if (aboveUpper && rsiBull && volConfirm) {
            state.inPos   = true;
            state.side    = 'long';
            state.entryPx = price;
            state.barsIn  = 0;
            return { side: 'buy', qty: riskQty };
        }
        if (belowLower && rsiBear && volConfirm) {
            state.inPos   = true;
            state.side    = 'short';
            state.entryPx = price;
            state.barsIn  = 0;
            return { side: 'sell', qty: riskQty };
        }
    }

    // ── Exit ───────────────────────────────────────────────────────
    if (state.inPos) {
        const stopPx = state.side === 'long'
            ? state.entryPx - ATR_MUL * atr
            : state.entryPx + ATR_MUL * atr;

        // ATR stop
        if ((state.side === 'long' && price < stopPx) ||
            (state.side === 'short' && price > stopPx)) {
            state.inPos   = false;
            state.side    = null;
            state.entryPx = 0;
            return { side: state.side === 'long' ? 'sell' : 'buy', qty: ctx.position };
        }

        // Middle band exit for longs, upper band exit for shorts
        if (state.side === 'long' && price >= middle) {
            state.inPos   = false;
            state.side    = null;
            state.entryPx = 0;
            return { side: 'sell', qty: ctx.position };
        }
        if (state.side === 'short' && price <= middle) {
            state.inPos   = false;
            state.side    = null;
            state.entryPx = 0;
            return { side: 'buy', qty: ctx.position };
        }

        // Reversal exit
        if ((state.side === 'long' && belowLower) || (state.side === 'short' && aboveUpper)) {
            state.inPos   = false;
            state.side    = null;
            state.entryPx = 0;
            return { side: state.side === 'long' ? 'sell' : 'buy', qty: ctx.position };
        }

        // Time exit: 24 bars max
        state.barsIn++;
        if (state.barsIn >= 24) {
            state.inPos   = false;
            state.side    = null;
            state.entryPx = 0;
            state.barsIn  = 0;
            return { side: state.side === 'long' ? 'sell' : 'buy', qty: ctx.position };
        }
    }

    return null;
}
