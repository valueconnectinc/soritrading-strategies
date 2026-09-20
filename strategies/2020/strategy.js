/*
 * @coinsori-strategy v1
 * name: Donchian Trend + Volume Confirmation
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * A pure trend-following strategy using Donchian channel breakouts.
 * Buys when price closes above the 20-bar highest high (breakout) AND
 * volume exceeds its 20-bar average (confirms the move with real participation).
 * Sells when price closes below the 20-bar lowest low (breakdown) OR
 * when an ATR(14) trailing stop is hit (2.5x ATR from entry).
 *
 * When it buys and sells: Enter on confirmed breakouts; exit on breakdowns or
 * when price retraces more than 2.5 ATR from the entry.
 * When it does NOT work: In choppy, range-bound markets where breakouts
 * repeatedly fail (false breakouts). Also fails in sustained bear trends
 * where the breakout entry is immediately wrong.
 */

function onUpdate(ctx) {
    // Warm-up: need 20 bars for Donchian + volume SMA
    const ema9 = ctx.ema(9, 1);
    const ema21 = ctx.ema(21, 1);
    const ema9_prev = ctx.ema(9, 2);
    const ema21_prev = ctx.ema(21, 2);
    if (ema9 == null || ema21 == null || ema9_prev == null || ema21_prev == null) return null;

    const atr = ctx.atr(14, 1);
    if (atr == null) return null;

    // Donchian channels: 20-bar highest high and lowest low
    const hi20  = ctx.high(20, 1);   // highest high of last 20 closed bars
    const lo20  = ctx.low(20, 1);   // lowest low of last 20 closed bars
    const hi20_prev  = ctx.high(20, 2);
    const lo20_prev  = ctx.low(20, 2);
    if (hi20 == null || lo20 == null || hi20_prev == null || lo20_prev == null) return null;

    // Volume confirmation: current volume > 20-bar volume SMA
    const volSMA = ctx.avgVol(20);
    if (volSMA == null || ctx.vol == null) return null;
    const volConfirm = ctx.vol > volSMA;

    const hasPosition = ctx.position > 0;
    const price = ctx.price;

    // BUY: price breaks above 20-bar high AND volume confirms
    const buySignal = price > hi20 && volConfirm;
    // SELL: price breaks below 20-bar low OR ATR trailing stop hit
    const sellSignal = price < lo20;
    const trailStop = hasPosition && ctx.entryPx > 0
        ? ctx.entryPx - 2.5 * atr
        : 0;
    const trailHit = hasPosition && trailStop > 0 && price < trailStop;

    if (!hasPosition && buySignal) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    if (hasPosition && (sellSignal || trailHit)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
