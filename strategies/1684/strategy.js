/*
 * @coinsori-strategy v1
 * name: EMA Crossover with Volume Filter
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossovers catch sustained trends; volume confirmation filters
 * out weak signals caused by thin liquidity. This combination avoids false breakouts.
 * When it buys and sells: Buy when EMA 9 crosses above EMA 21 AND volume is above its
 * 20-bar average. Sell on the reverse crossover or if price drops 3 ATR from the
 * highest point since entry.
 * When it does NOT work: In volatile pumps/dumps, volume spikes but the trend reverses
 * quickly — the EMA crossover lags and catches the wrong side of the move.
 */
function onUpdate(ctx) {
    const emaFast = ctx.ema(9, 2);
    const emaSlow = ctx.ema(21, 2);
    const emaFast1 = ctx.ema(9, 1);
    const emaSlow1 = ctx.ema(21, 1);
    const atr = ctx.atr(14, 2);
    const avgVol = ctx.avgVol(20);

    if (emaFast == null || emaSlow == null || emaFast1 == null || emaSlow1 == null) return null;
    if (atr == null || avgVol == null) return null;

    const price = ctx.price;
    const vol = ctx.vol;
    const openPos = ctx.position > 0;

    // ---- ENTRY: EMA golden cross + volume confirmation ----
    if (!openPos) {
        const goldenCross = emaFast1 <= emaSlow1 && emaFast > emaSlow;
        const volConfirm = vol > avgVol;
        if (goldenCross && volConfirm) {
            const qty = (ctx.cash * 0.98) / price;
            return { side: 'buy', qty: qty, type: 'market' };
        }
        return null;
    }

    // ---- EXIT: EMA death cross ----
    if (emaFast1 > emaSlow1 && emaFast <= emaSlow) {
        return { side: 'sell', qty: ctx.position, type: 'market' };
    }

    // ---- CHANDELIER EXIT: trail stop at highest high - 3*ATR ----
    const highestHigh = ctx.high(1);
    if (highestHigh == null) return null;
    const chandelierSL = highestHigh - atr * 3;
    if (price <= chandelierSL) {
        return { side: 'sell', qty: ctx.position, type: 'market' };
    }

    return null;
}
