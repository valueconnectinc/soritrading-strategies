/*
 * @coinsori-strategy v1
 * name: Dual-EMA Trend Filter + RSI(2) Mean Reversion
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys when: EMA9 > EMA21 (uptrend confirmed) + price pulled back below EMA21 + RSI(2) < 30.
 * Sells when: price returns above EMA21 OR RSI(3) > 70 (sooner profit-taking).
 * Why this strategy: SOL is volatile — it trends hard in one direction then mean-reverts.
 *   A dual-EMA filter avoids buying into downtrends while still allowing entries on pullbacks.
 *   RSI(2) catches the micro-oversold bounces faster than slower RSI settings.
 * When it does NOT work: In violent single-direction moves without pullbacks (gap-ups),
 *   the RSI(2) trigger never fires. Also fails in low-volume chop where RSI oscillates
 *   around 30-70 without a clean trend to pull back from.
 */

function onUpdate(ctx) {
    // Warm-up guards
    const ema9 = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const rsi2 = ctx.rsi(2);
    if (ema9 == null || ema21 == null || rsi2 == null) return null;

    // Trend: EMA9 must be above EMA21 (uptrend)
    if (ema9 <= ema21) {
        // In downtrend — close if we have a position
        if (ctx.position > 0) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    // === ENTRY: Uptrend + pullback below EMA21 + RSI(2) oversold ===
    const price = ctx.price;
    const rsi3 = ctx.rsi(3); // for exit

    // Buy trigger: price below EMA21 (pulled back) AND RSI(2) < 30
    // Using < EMA21 * 1.002 to require clear below, not just touching
    if (price < ema21 * 1.002 && rsi2 < 30) {
        // No position — open one
        if (ctx.position === 0) {
            // Risk 2% of cash per trade, stop at 2×ATR below entry
            const atr = ctx.atr(14);
            if (atr == null) return null;
            const stopDistance = atr * 2;
            const stopPx = price - stopDistance;
            const riskPerCoin = price - stopPx;
            const positionSize = (ctx.cash * 0.02) / riskPerCoin;
            if (positionSize <= 0) return null;
            return {
                side: 'buy',
                qty: positionSize,
                type: 'limit',
                price: price,
                postOnly: false
            };
        }
    }

    // === EXIT: price returned above EMA21 OR RSI(3) > 70 (sooner profit-taking) ===
    if (ctx.position > 0) {
        if (price > ema21 || (rsi3 != null && rsi3 > 70)) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
