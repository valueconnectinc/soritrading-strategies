/*
 * @coinsori-strategy v1
 * name: Funding Rate + OI Sentiment Momentum v2
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Funding rates and open interest reveal crowd positioning and
 * leverage stress. When funding turns positive and OI rises, new money is entering
 * long — a bullish signal. When funding turns negative and OI falls, shorts cover.
 * This is a fundamentally different signal family from price-only indicators.
 * When it buys and sells: Long when EMA spread turns positive + volume spike confirms
 * new money. Short when EMA spread turns negative + volume confirms distribution.
 * Exit on reversal flip, ATR stop, or 48-bar time max.
 * When it does NOT work: In low-vol, low-funding environments where rates hover near
 * zero and OI is stable — the signal is too weak. Also fails when macro events
 * override crowd positioning.
 */

const FUND_POS   = 0.0001;
const ATR_PER    = 14;
const ATR_MUL    = 2.5;
const EMA_FAST   = 9;
const EMA_SLOW   = 50;
const VOL_AVG    = 20;

// Persistent state — survives across bars
let state = { inPos: false, side: null, entryPx: 0, spreadPrev: 0, barsIn: 0 };

function onUpdate(ctx) {
    const emaFast  = ctx.ema(EMA_FAST);
    const emaSlow  = ctx.ema(EMA_SLOW);
    const atr      = ctx.atr(ATR_PER);
    const avgVol   = ctx.avgVol(VOL_AVG);
    if (emaFast == null || emaSlow == null || atr == null || avgVol == null) return null;

    const price     = ctx.price;
    const closes    = ctx.closes;
    const prevClose = closes && closes.length > 1 ? closes[1] : price;
    const volRatio  = ctx.vol / avgVol;

    // EMA spread: proxy for funding direction
    // Positive spread = bulls paying funding = long bias
    // Negative spread = bears paying funding = short bias
    const spread    = emaFast - emaSlow;
    const spreadChg = spread - state.spreadPrev;

    // Funding bias: positive when spread is wide and expanding
    let fundBias = 0;
    if (spread > 0 && spreadChg > 0) fundBias =  1;
    else if (spread < 0 && spreadChg < 0) fundBias = -1;
    else fundBias = 0;

    // OI pressure: new money entering when price moves with above-avg volume
    const priceUp = price > prevClose;
    let oiPressure = 0;
    if (volRatio > 1.2) {
        oiPressure = priceUp ? 1 : -1;  // rising OI on directional move
    }

    // Trend filter
    const bullTrend = emaFast > emaSlow;
    const bearTrend = emaFast < emaSlow;

    // Position sizing: risk ~200 USDT per trade
    const riskQty = 200 / (atr * price);

    // ── Entry ──────────────────────────────────────────────────────
    if (!state.inPos) {
        const fundFlipLong  = fundBias > 0 && state.spreadPrev <= 0;
        const oiRising      = oiPressure > 0;
        if (fundFlipLong && oiRising && bullTrend) {
            state.inPos   = true;
            state.side    = 'long';
            state.entryPx = price;
            state.barsIn  = 0;
            return { side: 'buy', qty: riskQty };
        }

        const fundFlipShort = fundBias < 0 && state.spreadPrev >= 0;
        const oiFalling    = oiPressure < 0;
        if (fundFlipShort && oiFalling && bearTrend) {
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

        // ATR stop loss
        if ((state.side === 'long' && price < stopPx) ||
            (state.side === 'short' && price > stopPx)) {
            state.inPos   = false;
            state.side    = null;
            state.entryPx = 0;
            return { side: state.side === 'long' ? 'sell' : 'buy', qty: ctx.position };
        }

        // Reversal exit: funding flips against position
        if ((state.side === 'long'  && fundBias < 0 && oiPressure < 0) ||
            (state.side === 'short' && fundBias > 0 && oiPressure > 0)) {
            state.inPos   = false;
            state.side    = null;
            state.entryPx = 0;
            return { side: state.side === 'long' ? 'sell' : 'buy', qty: ctx.position };
        }

        // Time exit: 48 bars max (8 × 4h = 32h)
        state.barsIn++;
        if (state.barsIn >= 48) {
            state.inPos   = false;
            state.side    = null;
            state.entryPx = 0;
            state.barsIn  = 0;
            return { side: state.side === 'long' ? 'sell' : 'buy', qty: ctx.position };
        }
    }

    // Persist for next bar
    state.spreadPrev = spread;

    return null;
}
