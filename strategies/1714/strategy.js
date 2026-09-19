/*
 * @coinsori-strategy v1
 * name: EMA Trend Following
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: EMA(9) crossing above EMA(21) with RSI confirming momentum
 * above 50 catches trending moves early. This is the opposite of mean reversion —
 * it follows the trend rather than fading it. More active and better suited for
 * 4h bars than divergence or band-touch strategies.
 * When it buys and sells: Buy when EMA9 crosses above EMA21 AND RSI > 50
 * (confirmed uptrend). Sell when EMA9 crosses below EMA21 OR RSI < 40
 * (trend exhaustion).
 * When it does NOT work: Choppy markets — whipsaws cause repeated losses as
 * EMAs cross back and forth. Also fails at trend reversals where it buys the top.
 */
function onUpdate(ctx) {
    // EMA calculations
    const ema9Cur  = ctx.ema(9,  0);
    const ema21Cur = ctx.ema(21, 0);
    const ema9Prev  = ctx.ema(9,  1);
    const ema21Prev = ctx.ema(21, 1);
    const ema9Prev2  = ctx.ema(9,  2);
    const ema21Prev2 = ctx.ema(21, 2);

    // RSI
    const rsiCur = ctx.rsi(14, 0);
    const rsi1   = ctx.rsi(14, 1);

    if (ema9Cur == null || ema21Cur == null ||
        ema9Prev == null || ema21Prev == null ||
        ema9Prev2 == null || ema21Prev2 == null ||
        rsiCur == null || rsi1 == null) return null;

    const priceCur = ctx.price;
    const price1   = ctx.closes[1];

    // ── OPEN POSITION LOGIC ──────────────────────────────────────────────
    if (ctx.position === 0) {
        // BUY: EMA9 crosses above EMA21 (bullish crossover)
        // Confirm: EMA9 was below EMA21 2 bars ago, now above at prev and cur
        const wasBelow2ago = ema9Prev2 < ema21Prev2;
        const wasBelow1ago  = ema9Prev  < ema21Prev;
        const isAboveNow    = ema9Cur   > ema21Cur;
        const emaCrossed   = wasBelow2ago && wasBelow1ago && isAboveNow;

        // RSI confirms: above 50 and rising
        const rsiConfirm = rsiCur > 50 && rsiCur > rsi1;

        if (emaCrossed && rsiConfirm) {
            return { side: 'buy', qty: ctx.cash / priceCur * 0.99 };
        }

        // FALLBACK: Strong trend — price above both EMAs, RSI > 55, pullback entry
        const priceAboveBoth = priceCur > ema9Cur && priceCur > ema21Cur;
        const rsiStrong = rsiCur > 55 && rsiCur > rsi1;
        // Pullback: price dipped below fast EMA but recovering
        const pullback = price1 < ema9Prev && priceCur > ema9Cur;
        if (priceAboveBoth && rsiStrong && pullback) {
            return { side: 'buy', qty: ctx.cash / priceCur * 0.99 };
        }
    }

    // ── CLOSE POSITION LOGIC ─────────────────────────────────────────────
    if (ctx.position > 0) {
        // SELL 1: EMA9 crosses below EMA21 (bearish crossover)
        const wasAbove2ago = ema9Prev2 > ema21Prev2;
        const wasAbove1ago = ema9Prev  > ema21Prev;
        const isBelowNow   = ema9Cur   < ema21Cur;
        const emaDeathCross = wasAbove2ago && wasAbove1ago && isBelowNow;
        if (emaDeathCross) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 2: RSI drops below 40 (trend exhaustion)
        if (rsiCur < 40) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 3: Price closes below EMA21 (trend broken)
        if (priceCur < ema21Cur && price1 < ctx.ema(21, 1)) {
            return { side: 'sell', qty: ctx.position };
        }

        // SELL 4: Stop loss — 10% from entry
        const entryPx = ctx.entryPx || priceCur;
        if (priceCur < entryPx * 0.90) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
