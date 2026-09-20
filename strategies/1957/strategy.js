/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion + BB Confirmation (ETHUSDT 4H)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: RSI below 30 signals oversold exhaustion — price tends to bounce.
 * BB lower band confirms price is at a relative low. This is mean reversion, not trend following.
 * When it buys and sells: Buy when RSI(14) < 30 AND price is near the lower BB band
 * (within 10% of it). Sell when RSI rises above 60 or price reaches the upper BB band.
 * When it does NOT work: Crashes hard in sustained downtrends where RSI stays oversold
 * for weeks (e.g., 2022 bear market) — the bounce never comes before the next leg down.
 */

function onUpdate(ctx) {
    // RSI for overbought/oversold signal
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // Bollinger Bands for relative price context
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;
    const lower = bb.lower;
    const mid   = bb.mid;
    const upper = bb.upper;

    // ATR for stop-loss sizing
    const atr = ctx.atr(14);
    if (atr == null) return null;

    // Volume: require above-average volume on the entry bar
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volRatio = ctx.vol / avgVol;

    // Price proximity to lower BB (0 = exactly at lower band, 1 = 100% above it)
    const proximityToLower = (ctx.price - lower) / lower;

    // --- ENTRY: RSI oversold AND price near lower BB AND volume confirm ---
    // proximityToLower < 0.10 means price is within 10% of the lower band
    // volRatio > 0.8 ensures the signal isn't on a dead-cat bounce
    const longCondition =
        rsi < 30 &&
        proximityToLower < 0.10 &&
        volRatio > 0.8 &&
        ctx.position === 0;

    if (longCondition) {
        return {
            side: 'buy',
            qty: ctx.cash / ctx.price * 0.97,
            type: 'smart',
            trigger: {
                side: 'sell',
                px: ctx.price - 1.5 * atr,  // hard stop 1.5 ATR below entry
                type: 'stop'
            }
        };
    }

    // --- TAKE PROFIT: RSI rich OR price at upper band ---
    // RSI > 65 = overbought, momentum is exhausted — take profit
    // Close above mid BB = mean reversion target reached
    const tpCondition =
        (ctx.position > 0 && rsi > 65) ||
        (ctx.position > 0 && ctx.price > mid);

    if (tpCondition) {
        return { side: 'sell', qty: ctx.position };
    }

    // --- TRAILING STOP: lock profits if price moves up ---
    // Move stop to 1 ATR below current price (locks in gains above 1 ATR)
    if (ctx.position > 0) {
        return {
            side: 'sell',
            qty: ctx.position,
            type: 'smart',
            trigger: {
                side: 'sell',
                px: ctx.price - 1.0 * atr,
                type: 'stop'
            }
        };
    }

    return null;
}
