/*
 * @coinsori-strategy v1
 * name: EMA Cross with Volume Confirmation
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: EMA crossovers are a classic trend-following signal; adding volume confirmation
 * filters out weak breakouts that cause whipsaws. ATR-based stops prevent small losses from becoming large ones.
 * When it buys and sells: Buy when fast EMA crosses above slow EMA AND volume is above average (1.5x).
 * Sell when fast EMA crosses below slow EMA OR price hits ATR-based stop loss.
 * When it does NOT work: Choppy sideways markets where EMAs cross repeatedly with no trend — each cross triggers a trade and fees erode returns.
 */

function onUpdate(ctx) {
    // Warm-up guard: need at least 200 bars for EMAs
    const emaFast = ctx.ema(9);
    const emaSlow = ctx.ema(21);
    const emaFast1 = ctx.ema(9, 1);
    const emaSlow1 = ctx.ema(21, 1);
    if (emaFast == null || emaSlow == null || emaFast1 == null || emaSlow1 == null) return null;

    // Volume confirmation: current volume > 1.5x 20-bar average
    const avgVol = ctx.avgVol(20);
    const vol = ctx.vol || 0;
    if (avgVol == null || avgVol === 0) return null;
    const volConfirm = vol >= avgVol * 1.5;

    // ATR for stop loss
    const atr = ctx.atr(14);
    if (atr == null) return null;

    // Check for open position
    if (ctx.position > 0) {
        // Exit: EMA bearish cross OR price drops 1.5 ATR from entry
        const emaBearishCross = emaFast1 >= emaSlow1 && emaFast < emaSlow;
        const stopLoss = ctx.entryPx - 1.5 * atr;
        if (emaBearishCross || ctx.price < stopLoss) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    // Entry: EMA bullish cross AND volume confirmation
    const emaBullishCross = emaFast1 <= emaSlow1 && emaFast > emaSlow;
    if (emaBullishCross && volConfirm) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    return null;
}
