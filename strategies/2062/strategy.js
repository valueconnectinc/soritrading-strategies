/*
 * @coinsori-strategy v1
 * name: ATR Regime-Adaptive Mean Reversion (SOLUSDT 4H)
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Uses ATR ratio (fast ATR14 / slow ATR50) to detect market regime:
 * - CHOP (ratio < 0.65): price oscillating in a range — use mean reversion
 * - TREND (ratio > 0.95): directional move underway — use momentum breakout
 * The ratio switches modes dynamically each bar, adapting to changing conditions.
 *
 * When it buys and sells:
 * - CHOP mode: buy when RSI < 30 and price touches or crosses below the BB lower band.
 * - TREND mode: buy when EMA 9 crosses above EMA 21 with EMA50 confirmation (all bullish).
 * - Exit: regime flips away from current mode, or ATR trailing stop activates.
 *
 * When it does NOT work: In choppy markets with no clear range boundaries the BB
 * signal fires constantly; in strong sustained trends the EMA cross lags entry by 2-3 bars.
 * SOL's high volatility can cause outsized slippage vs backtest fills.
 */
function onUpdate(ctx) {
    // ATR ratio for regime detection
    const atrFast = ctx.atr(14, 1);
    const atrSlow = ctx.atr(50, 1);
    if (atrFast == null || atrSlow == null) return null;

    const atrRatio = atrFast / atrSlow;

    // Bollinger Bands for mean-reversion entry
    const bb = ctx.bb(20, 2, 1);
    if (bb == null) return null;

    // EMA for trend entry and confirmation
    const ema9  = ctx.ema(9, 1);
    const ema21 = ctx.ema(21, 1);
    const ema50 = ctx.ema(50, 1);
    if (ema9 == null || ema21 == null || ema50 == null) return null;

    // RSI for entry confirmation
    const rsi14 = ctx.rsi(14, 1);
    if (rsi14 == null) return null;

    // ATR for stop distance
    const atrVal = ctx.atr(14, 1);
    if (atrVal == null) return null;

    const price = ctx.price;
    if (price == null) return null;

    // Regimes
    const isChop  = atrRatio < 0.65;
    const isTrend = atrRatio > 0.95;

    // State — use as plain object, not function call
    const state = ctx.state;
    if (state.pos == null)     state.pos     = 0;
    if (state.entryPx == null) state.entryPx = 0;
    if (state.stopPx == null)  state.stopPx  = 0;
    if (state.trailPx == null) state.trailPx = 0;
    if (state.mode == null)    state.mode    = 'none';

    const pos     = state.pos;
    const entryPx = state.entryPx;
    const stopPx  = state.stopPx;
    const trailPx = state.trailPx;
    const mode    = state.mode;

    // ==== ENTRY CONDITIONS ====

    // CHOP mode: RSI < 30 + price at/below BB lower band
    const chopLong = isChop && rsi14 < 30 && price <= bb.lower;

    // TREND mode: EMA 9/21 golden cross + EMA50 confirmation (all EMAs rising)
    const emaBullCross = ema9 > ema21;
    const emaConfirm   = ema9 > ema50 && ema21 > ema50;
    const trendLong    = isTrend && emaBullCross && emaConfirm;

    // ==== EXIT CONDITIONS ====
    const regimeShifted = (mode === 'chop' && !isChop) || (mode === 'trend' && !isTrend);
    const trailingHit    = trailPx > 0 && price < trailPx;
    const stopHit        = stopPx  > 0 && price < stopPx;

    if (pos === 0) {
        if (chopLong) {
            state.pos     = 1;
            state.entryPx = price;
            state.stopPx  = price - atrVal * 1.5;
            state.trailPx = 0;
            state.mode    = 'chop';
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
        if (trendLong) {
            state.pos     = 1;
            state.entryPx = price;
            state.stopPx  = price - atrVal * 2.5;
            state.trailPx = 0;
            state.mode    = 'trend';
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
        return null;
    }

    if (pos === 1) {
        let newTrail = trailPx;

        // Activate trailing stop at 1.5 ATR profit
        if (trailPx === 0 && price > entryPx + atrVal * 1.5) {
            newTrail = entryPx + atrVal * 1.0;
            state.trailPx = newTrail;
        }
        // Trail moves up, never down
        if (newTrail > 0 && price > newTrail) {
            newTrail = price - atrVal * 1.0;
            state.trailPx = newTrail;
        }

        if (regimeShifted || trailingHit || stopHit) {
            state.pos     = 0;
            state.entryPx = 0;
            state.stopPx  = 0;
            state.trailPx = 0;
            state.mode    = 'none';
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    return null;
}
