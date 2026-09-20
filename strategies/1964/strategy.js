/*
 * @coinsori-strategy v1
 * name: EMA Crossover + Volume Momentum
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 1000
 *
 * Buys when the fast EMA (9) crosses above the slow EMA (21) with above-average
 * volume confirming the move. Sells when fast EMA crosses back below slow EMA.
 * Simple, high-probability trend-following entry on a mid-cap altcoin.
 * When it does NOT work: choppy markets where EMAs weave — generates whipsaws
 * and small losses that compound. Strong bear trends where exits are too late.
 */

function onUpdate(ctx) {
    // Warm-up: need 21 EMA bars
    const emaFast = ctx.ema(9, 1);
    const emaFastPrev = ctx.ema(9, 2);
    const emaSlow = ctx.ema(21, 1);
    const emaSlowPrev = ctx.ema(21, 2);
    if (emaFast == null || emaFastPrev == null || emaSlow == null || emaSlowPrev == null) return null;

    // Volume confirmation: current volume > 20-bar average
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volConfirm = ctx.vol > avgVol;

    // === ENTRY: EMA golden cross ===
    // Fast crosses above slow AND volume confirms
    const goldenCross = emaFastPrev <= emaSlowPrev && emaFast > emaSlow;

    if (!ctx.position && goldenCross && volConfirm) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }

    // === EXIT: EMA death cross ===
    const deathCross = emaFastPrev >= emaSlowPrev && emaFast < emaSlow;

    if (ctx.position > 0 && deathCross) {
        return { side: 'sell', qty: ctx.position };
    }

    // === TIME-BASED STOP: exit after 20 bars if still in position ===
    // Track bars since entry using a static counter (safe for backtest)
    if (ctx.position > 0) {
        // Use entry bar index — ctx.i gives current bar number
        // We store entry bar in a closure variable (persists across calls in same backtest run)
        if (onUpdate.entryBar === undefined) onUpdate.entryBar = ctx.i;
        const barsHeld = ctx.i - onUpdate.entryBar;
        if (barsHeld >= 20) {
            onUpdate.entryBar = undefined;
            return { side: 'sell', qty: ctx.position };
        }
    } else {
        onUpdate.entryBar = undefined;
    }

    return null;
}
