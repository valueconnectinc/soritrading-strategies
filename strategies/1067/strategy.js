/*
 * @coinsori-strategy v1
 * name: EMA Crossover + ATR Stop 4H
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossovers catch medium-term trends on BTC's 4H chart.
 * The fast EMA crossing above the slow EMA signals momentum shifting bullish.
 * When it buys and sells: Buy when EMA(9) crosses above EMA(21). Sell when
 * EMA(9) crosses back below EMA(21) OR price hits 2x ATR stop-loss.
 * When it does NOT work: Choppy markets cause repeated EMA crosses with no
 * sustained trend, burning through small losses — the strategy whipsaws.
 */
function onUpdate(ctx) {
    // Need at least 21 bars for EMA(21)
    const emaFast = ctx.ema(9);
    const emaSlow = ctx.ema(21);
    if (emaFast == null || emaSlow == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    // ── ENTRY: EMA(9) crosses above EMA(21) ──
    if (ctx.position <= 0) {
        const emaFastPrev = ctx.ema(9, 1);
        const emaSlowPrev = ctx.ema(21, 1);
        if (emaFastPrev == null || emaSlowPrev == null) return null;

        // Bullish crossover: fast was below/equal slow, now above
        if (emaFastPrev <= emaSlowPrev && emaFast > emaSlow) {
            return {
                side: 'buy',
                qty: ctx.cash / ctx.price * 0.99
            };
        }
        return null;
    }

    // ── IN POSITION: exit on bearish crossover OR ATR stop ──
    const emaFastPrev = ctx.ema(9, 1);
    const emaSlowPrev = ctx.ema(21, 1);
    if (emaFastPrev == null || emaSlowPrev == null) return null;

    // Bearish crossover: fast was above/equal slow, now below
    if (emaFastPrev >= emaSlowPrev && emaFast < emaSlow) {
        return {
            side: 'sell',
            qty: ctx.position
        };
    }

    // ATR stop-loss: 2x ATR below entry price
    const stopPx = ctx.entryPx - 2 * atr;
    if (ctx.price <= stopPx) {
        return {
            side: 'sell',
            qty: ctx.position
        };
    }

    return null;
}
