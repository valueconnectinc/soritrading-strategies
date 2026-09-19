/*
 * @coinsori-strategy v1
 * name: EMA20 Trend Filter + RSI Momentum + Trailing Stop
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * EMA(20) trend filter + RSI momentum entries + ATR trailing stop.
 * Why this strategy: EMA20 keeps you in cash during bear markets (price below EMA20
 * = no long entries). RSI crossing above 50 catches genuine recovery bounces.
 * ATR trailing stop locks in gains and limits drawdowns without a fixed stop-loss.
 * When it buys and sells: Buy when RSI crosses above 50 with price above EMA20.
 * Sell when RSI drops below 40 OR when ATR trailing stop is hit.
 * When it does NOT work: In strong parabolic pumps, RSI never drops below 40 and
 * the strategy holds through the entire move — but also through the crash afterward.
 * The EMA20 filter prevents the worst drawdowns but cannot prevent all losses.
 */
function onUpdate(ctx) {
    const ema20 = ctx.ema(20);
    if (ema20 == null) return null;

    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const rsi_1 = ctx.rsi(14, 1);
    if (rsi_1 == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    // State: track peak price for trailing stop
    // ctx.state is a safe per-bar key-value store
    const peakKey = 'peakPx';
    const entryKey = 'entryPx';

    const inPos = ctx.position > 0;

    // Update peak price while in position
    if (inPos) {
        const prevPeak = ctx.state[peakKey] || ctx.price;
        ctx.state[peakKey] = Math.max(prevPeak, ctx.price);
    }

    // Entry: RSI crosses above 50 + price above EMA20 (bull trend confirmed)
    const rsiBull = rsi_1 <= 50 && rsi > 50;
    const bullTrend = ctx.price > ema20;

    // Exit: RSI drops below 40 (momentum fading)
    const rsiBear = rsi_1 >= 40 && rsi < 40;

    // Trailing stop: activate after 3% profit, trail at 2.5× ATR below peak
    const trailActivate = 0.03; // 3% profit needed before trailing
    const trailMult = 2.5;
    const entryPx = ctx.state[entryKey];
    const peakPx = ctx.state[peakKey] || 0;
    const posProfitable = entryPx > 0 && (peakPx - entryPx) / entryPx >= trailActivate;
    const trailStopPx = posProfitable ? peakPx - trailMult * atr : 0;
    const trailHit = posProfitable && ctx.price < trailStopPx;

    if (!inPos) {
        if (rsiBull && bullTrend) {
            ctx.state[peakKey] = ctx.price;
            ctx.state[entryKey] = ctx.price;
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        return null;
    }

    if (inPos) {
        // Clear state on exit
        if (rsiBear || trailHit) {
            ctx.state[peakKey] = 0;
            ctx.state[entryKey] = 0;
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
