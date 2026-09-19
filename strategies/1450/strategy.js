/*
 * @coinsori-strategy v1
 * name: ATR Trend Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * ATR-based trend-following strategy that enters on pullbacks within an established trend.
 * Uses 20 EMA for trend direction, ATR for stop placement, and RSI for momentum confirmation.
 * Buys when price is above EMA (uptrend) and pulls back to within 0.5 ATR of EMA with RSI recovering.
 * Sells on ATR trailing stop or RSI overbought.
 * Works best in trending markets with clear pullback entries.
 * Loses in choppy, directionless markets where price oscillates around the EMA.
 */

function onUpdate(ctx) {
    // ATR for stop distance and volatility context
    const atr = ctx.atr(14);
    if (atr == null) return null;

    // EMA 20 for trend direction
    const ema = ctx.ema(20);
    if (ema == null) return null;

    // RSI for momentum confirmation
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const price     = ctx.price;
    const position  = ctx.position;
    const entryPx   = ctx.entryPx;

    // ── Trend: price above EMA = uptrend ──
    const inUptrend = price > ema;

    // ── Entry zone: price within 0.5 ATR of EMA (pullback to trend line) ──
    const pullbackZone = price <= ema + 0.5 * atr;

    // ── RSI recovery: rising from oversold, but not yet overbought ──
    // RSI(1) > RSI(2) means RSI is rising (confirming bounce)
    const rsiNow = ctx.rsi(14, 0);
    const rsiPrev = ctx.rsi(14, 1);
    const rsiRecovering = rsiNow != null && rsiPrev != null && rsiNow > rsiPrev && rsiNow > 40 && rsiNow < 65;

    // ── Volume confirmation ──
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volRising = ctx.vol > avgVol * 0.9; // volume at least 90% of average (not dried up)

    // ── ENTRY: Uptrend + pullback to EMA zone + RSI recovering ──
    if (position === 0 && inUptrend && pullbackZone && rsiRecovering && volRising) {
        // Position size: risk 2% of cash per trade
        // Stop distance = 2 × ATR below EMA
        const stopPx = ema - 2.0 * atr;
        const riskAmt = ctx.cash * 0.02;
        const qty = riskAmt / (price - stopPx);
        return { side: 'buy', qty: qty * 0.99 };
    }

    // ── EXIT: ATR trailing stop + RSI overbought ──
    if (position > 0) {
        // Stop: 2.5× ATR below entry (wider than entry stop for breathing room)
        const hardStop = entryPx - 2.5 * atr;

        // Take profit: RSI overbought (>70) or price above EMA + 3× ATR
        const tpPx = ema + 3.0 * atr;
        const rsiOverbought = rsi > 70;

        if (price <= hardStop || price >= tpPx || rsiOverbought) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
