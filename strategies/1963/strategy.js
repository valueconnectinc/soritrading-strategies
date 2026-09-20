/*
 * @coinsori-strategy v1
 * name: ATR Volatility Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 1000
 *
 * Buys when price breaks above a 20-period SMA with expanding ATR (volatility rising)
 * and RSI confirming upward momentum. Uses ATR for a tight trailing stop — the stop
 * widens as the trade moves in favor. Exits on either the ATR trailing stop or
 * when RSI drops below 45 (momentum loss).
 * When it does NOT work: choppy, low-volume markets where breakouts fail repeatedly,
 * and in strongly trending bear markets where tight ATR stops get whipsawed.
 */

function onUpdate(ctx) {
    // Warm-up guard
    const ema20 = ctx.ema(20, 1);
    const ema20Prev = ctx.ema(20, 2);
    const atr = ctx.atr(14, 1);
    const atrPrev = ctx.atr(14, 2);
    const rsi = ctx.rsi(14, 1);
    const rsiPrev = ctx.rsi(14, 2);
    if (ema20 == null || ema20Prev == null || atr == null || atrPrev == null || rsi == null || rsiPrev == null) return null;

    // === ENTRY: Breakout setup ===
    // 1. Price crosses above 20 EMA (breakout from compression)
    const priceAboveEma = ctx.price > ema20;
    const prevBelowEma = ctx.closes[1] <= ema20Prev;
    // 2. ATR expanding — volatility is rising (not a fake spike)
    const atrRising = atr > atrPrev;
    // 3. RSI confirming momentum (above 50 = bullish)
    const rsiConfirm = rsi > 50 && rsiPrev <= 50;

    if (!ctx.position && priceAboveEma && prevBelowEma && atrRising && rsiConfirm) {
        // Position size: use ATR to set stop distance = 2 × ATR
        // qty = cash × 0.98 / entry price
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
    }

    // === EXIT: ATR trailing stop ===
    if (ctx.position > 0) {
        // ATR stop: exit if price drops more than 2 × ATR from session high
        // Track entry price via ctx.entryPx
        const entryPx = ctx.entryPx;
        if (entryPx == null) return null;
        const stopDist = 2 * atr;
        const stopPx = entryPx - stopDist; // hard stop below entry
        // More sophisticated: use highest high since entry for trailing
        // ctx.high(n) gives highest high of last n bars
        const highSinceEntry = ctx.high(20); // highest high in last 20 bars
        if (highSinceEntry == null) return null;
        const trailingStopPx = highSinceEntry - stopDist;

        // Exit if price falls below trailing stop OR RSI drops below 45
        if (ctx.price < trailingStopPx || rsi < 45) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
