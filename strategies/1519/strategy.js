/*
 * @coinsori-strategy v1
 * name: MACD Momentum Trend Follower
 * ex: binance
 * syms: LINKUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: LINKUSDT 4h trends tend to be sustained — MACD crossover
 * catches the start of momentum moves and holds through them. Volume filters out
 * fake breakouts. ATR stop prevents runaway losses when trends reverse.
 * When it buys and sells: Buy when MACD crosses above its signal line with
 * above-average volume. Sell when MACD crosses below signal line.
 * When it does NOT work: In choppy/ranging markets with frequent MACD flips —
 * each false signal triggers a trade and bleeds on fees and small reversals.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────
    const macdNow  = ctx.macd(12, 26, 9, 0);
    const macdPrev = ctx.macd(12, 26, 9, 1);
    const macdPrev2= ctx.macd(12, 26, 9, 2);
    const atr      = ctx.atr(14);
    const avgVol   = ctx.avgVol(20);

    if (macdNow == null || macdPrev == null || macdPrev2 == null) return null;
    if (macdNow.signal == null || macdPrev.signal == null) return null;
    if (atr == null || avgVol == null) return null;

    // ── MACD Bullish Crossover ───────────────────────────────────────
    // Previous bar: MACD <= signal. Current bar: MACD > signal.
    const bullCross = macdPrev.macd <= macdPrev.signal && macdNow.macd > macdNow.signal;

    // Volume confirmation: current volume above 20-bar average.
    // Using volPrev (previous bar's volume) to avoid repainting the current forming bar.
    const volConfirm = ctx.volPrev > avgVol;

    // ── MACD Bearish Crossover ───────────────────────────────────────
    const bearCross = macdPrev.macd >= macdPrev.signal && macdNow.macd < macdNow.signal;

    // ── Position management ─────────────────────────────────────────
    if (ctx.position === 0) {
        // No position — look for entry
        if (bullCross && volConfirm) {
            // Market buy, size = 99% of cash
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        return null;
    }

    // In position — look for exit
    if (bearCross) {
        return { side: 'sell', qty: ctx.position };
    }

    // Stop-loss: if price drops more than 2 × ATR from entry, exit.
    // This is a mental stop — checked every bar, not a guaranteed fill price.
    const entryDist = ctx.price - ctx.entryPx;
    if (entryDist < 0 && Math.abs(entryDist) > 2 * atr) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
