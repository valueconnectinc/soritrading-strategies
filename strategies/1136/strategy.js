/*
 * @coinsori-strategy v1
 * name: EMA Cross + Donchian Breakout
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Dual-EMA crossover enhanced with Donchian channel breakout filter.
 * Only buys when price breaks above the 20-bar high AND the EMA golden
 * cross fires — avoids false signals in ranging markets.
 * When it does NOT work: in strong sustained trends the Donchian filter
 * delays entry, missing the early part of the move.
 */

function onUpdate(ctx) {
    const emaFast  = ctx.ema(9);
    const emaSlow  = ctx.ema(21);
    const rsi      = ctx.rsi(14);
    const price    = ctx.price;
    if (emaFast == null || emaSlow == null || rsi == null || price == null) return null;

    const emaFastPrev = ctx.ema(9, 1);
    const emaSlowPrev = ctx.ema(21, 1);
    if (emaFastPrev == null || emaSlowPrev == null) return null;

    // Donchian 20-bar high (highest close of last 20 bars)
    const dcHigh = ctx.high(20);
    if (dcHigh == null) return null;

    // ── ENTRY: EMA golden cross + price at or above 20-bar high ──
    const bullishCross = emaFastPrev <= emaSlowPrev && emaFast > emaSlow;
    const donchianBreak = price >= dcHigh * 0.998; // within 0.2% of 20-bar high
    if (bullishCross && donchianBreak && rsi < 65 && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── EXIT: EMA death cross OR RSI overbought ──
    const bearishCross = emaFastPrev >= emaSlowPrev && emaFast < emaSlow;
    if ((bearishCross || rsi > 75) && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
