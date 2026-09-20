/*
 * @coinsori-strategy v1
 * name: VWAP Mean-Reversion
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: VWAP is a key institutional benchmark. When price trades far above VWAP,
 * buyers are chasing; when far below, sellers are exhausted. Price reliably reverts to VWAP
 * in non-trending sessions, making it a clean mean-reversion signal.
 * When it buys and sells: BUY when price drops >2.5% below VWAP with above-average volume
 * (institutions defending VWAP from below). SELL when price reverts within 0.5% of VWAP
 * or hits a 3% stop-loss.
 * When it does NOT work: Strong trending sessions — if BTC breaks hard in one direction,
 * price stays above/below VWAP for extended periods and the stop-loss triggers repeatedly.
 */

function onUpdate(ctx) {
    // ── Warm-up ──────────────────────────────────────────────────────────────
    const smaV = ctx.sma(20);
    if (smaV == null) return null;

    const curHigh  = ctx.high(0);
    const curLow   = ctx.low(0);
    const curClose = ctx.price;
    const curVol   = ctx.vol;

    if (curHigh == null || curLow == null || curVol == null) return null;

    // ── Rolling VWAP (24-bar session window) ────────────────────────────────
    // Maintain cumulative TP×Vol and cumulative Vol in state
    const cumKey  = 'vwapCum';
    const volKey  = 'vwapVol';
    const barKey  = 'vwapBar';

    let cumTP  = ctx.state[cumKey]  || 0;
    let cumVol = ctx.state[volKey]  || 0;
    let lastBar = ctx.state[barKey] || -1;

    // Only accumulate on new bars (each 1h candle = one accumulation step)
    if (ctx.i !== lastBar) {
        const typicalPrice = (curHigh + curLow + curClose) / 3;
        cumTP  += typicalPrice * curVol;
        cumVol += curVol;
        lastBar = ctx.i;
    }

    // Cap the rolling window at ~48 bars to prevent stale VWAP after quiet periods
    const avgV = ctx.avgVol(48);
    if (avgV != null && cumVol > avgV * 96) {
        cumTP  *= 0.5;
        cumVol *= 0.5;
    }

    ctx.state[cumKey] = cumTP;
    ctx.state[volKey] = cumVol;
    ctx.state[barKey] = lastBar;

    const vwap = cumVol > 0 ? cumTP / cumVol : curClose;
    if (!isFinite(vwap) || vwap === 0) return null;

    // ── Signals ─────────────────────────────────────────────────────────────
    // % deviation from VWAP — positive = above, negative = below
    const devPct = (curClose - vwap) / vwap;

    // Volume confirmation: above-average volume confirms the signal
    const avgVol = ctx.avgVol(20);
    const volConfirm = avgVol != null && curVol > avgVol * 1.1;

    // BUY: price deeply below VWAP + volume confirmation (reversion to VWAP)
    const buySignal  = devPct < -0.025 && volConfirm;

    // SELL: price reverted close to VWAP (within 0.5%)
    const sellSignal = devPct > -0.005;

    // ATR-based stop-loss: 2× ATR below entry — tight enough to protect
    const atr = ctx.atr(14);
    const entryPx = ctx.position > 0 ? ctx.entryPx : curClose;
    const sl = atr != null
        ? entryPx - atr * 2.0   // 2×ATR hard stop
        : entryPx * 0.97;       // 3% fallback stop

    // ── Position management ──────────────────────────────────────────────────
    if (ctx.position === 0 && buySignal) {
        // Market buy — deploy 90% of available cash
        return { side: 'buy', qty: (ctx.cash / curClose) * 0.90 };
    }

    if (ctx.position > 0) {
        // Sell on VWAP reversion
        if (sellSignal) {
            return { side: 'sell', qty: ctx.position };
        }
        // Hard stop on deep drawdown
        if (curClose < sl) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
