/*
 * @coinsori-strategy v1
 * name: EMA Crossover ATR Momentum BNB
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * EMA 9/21 crossover momentum with ATR volatility confirmation.
 * Enters when EMA9 crosses above EMA21 (bullish momentum) AND RSI > 40 (confirming strength)
 * AND ATR is rising (confirming trending/volatile environment, not chop).
 * Exits on EMA9 crossing below EMA21 OR RSI falls below 40 OR ATR-based stop.
 * Works best in trending altcoin markets with clear directional moves.
 * Loses in choppy, low-vol markets where EMAs cross repeatedly without momentum.
 */

function onUpdate(ctx) {
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const rsi   = ctx.rsi(14);
    const atr   = ctx.atr(14);
    const atrPrev = ctx.atr(14, 1);   // ATR 1 bar ago for direction check
    if (ema9 == null || ema21 == null || rsi == null || atr == null || atrPrev == null) return null;

    const price = ctx.price;
    const position = ctx.position;

    // ── ATR rising = trending/volatile market (not choppy) ──
    // This filter was the key differentiator in Exp 296 (SOLUSDT +27.91%)
    const atrRising = atr > atrPrev;

    // ── ENTRY: EMA9 crosses above EMA21 (bullish crossover) ──
    // Require: RSI > 40 (confirm uptrend strength) + ATR rising (confirm volatility)
    if (position === 0) {
        const bullCross = ema9 > ema21;
        const bullCrossPrev = ctx.ema(9, 1) <= ctx.ema(21, 1);
        if (bullCross && bullCrossPrev && rsi > 40 && atrRising) {
            // Risk 2% of cash per trade
            const stopPx = price - 2.0 * atr;
            const riskAmt = ctx.cash * 0.02;
            const qty = riskAmt / (price - stopPx);
            if (qty > 0) return { side: 'buy', qty: qty * 0.99 };
        }
    }

    // ── EXIT: EMA9 crosses below EMA21 (bearish crossover) ──
    if (position > 0) {
        const bearCross = ema9 < ema21;
        const bearCrossPrev = ctx.ema(9, 1) >= ctx.ema(21, 1);
        const rsiWeak = rsi < 40;
        const hardStop = ctx.position > 0 ? (ctx.position > 0 ? ctx.entryPx - 2.5 * atr : price) : price;
        const trailingStop = price < ctx.entryPx - 2.0 * atr;

        if (bearCross && bearCrossPrev) {
            return { side: 'sell', qty: ctx.position };
        }
        if (rsiWeak) {
            return { side: 'sell', qty: ctx.position };
        }
        if (trailingStop) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
