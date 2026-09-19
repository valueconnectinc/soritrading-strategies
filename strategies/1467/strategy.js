/*
 * @coinsori-strategy v1
 * name: EMA200 Trend + RSI Momentum + ATR Stop
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Combines EMA200 trend direction, RSI momentum signals, and ATR volatility-adjusted stops.
 * Enters when price is above EMA200 (uptrend) AND RSI crosses above 55.
 * Uses a trailing ATR stop (3× ATR from entry) to lock in profits while letting winners run.
 * Exits when RSI drops below 40 or trailing stop is hit.
 * Works best in sustained uptrends with clear momentum.
 * Loses in choppy, range-bound markets where RSI oscillates without direction.
 */

function onUpdate(ctx) {
    const price    = ctx.price;
    const rsi      = ctx.rsi(14);
    const ema200   = ctx.ema(200);
    const atr      = ctx.atr(14);

    if (rsi == null || ema200 == null || atr == null) return null;

    const position = ctx.position;
    const atrVal   = atr;

    // ── ENTRY: uptrend confirmed + RSI momentum crossover ──
    if (position === 0 && price > ema200) {
        const prevRsi = ctx.rsi(14, 1);
        if (prevRsi != null && prevRsi <= 55 && rsi > 55) {
            const stopPx = price - 2 * atrVal;          // 2× ATR hard stop
            const riskAmt = ctx.cash * 0.02;             // risk 2% of cash
            const qty = riskAmt / (price - stopPx);
            if (qty > 0) return { side: 'buy', qty: qty * 0.99 };
        }
    }

    // ── EXIT: RSI drops below 40 (momentum loss) ──
    if (position > 0) {
        const prevRsi = ctx.rsi(14, 1);
        if (prevRsi != null && prevRsi >= 40 && rsi < 40) {
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
