/*
 * @coinsori-strategy v1
 * name: Momentum Pullback — ETHUSDT 4H
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Instead of buying the oversold dip directly (which catches falling knives),
 * wait for RSI to actually bounce back above 35 — confirming the bounce has started.
 * Trend confirmed by price above EMA20 above EMA50 to avoid buying in downtrends.
 * When it buys: RSI was <35, now recovers above 35, price above EMA20, EMA20 above EMA50.
 * When it sells: RSI crosses above 65 OR price crosses below EMA20 OR 24 bars pass.
 * When it does NOT work: In choppy markets where RSI oscillates without clear direction,
 * triggering multiple small losses. Also fails in strong extended rallies (no meaningful pullbacks).
 */

let entryBar = null;

function onUpdate(ctx) {
    // --- Trend confirmation: EMA20 > EMA50 (bullish alignment) ---
    const ema20 = ctx.ema(20);
    const ema50 = ctx.ema(50);
    if (ema20 == null || ema50 == null) return null;

    // --- RSI values: current and 1 bar ago (for bounce detection) ---
    const rsiNow  = ctx.rsi(14);
    const rsiPrev = ctx.rsi(14, 1);
    if (rsiNow == null || rsiPrev == null) return null;

    const trendBull = ema20 > ema50 && ctx.price > ema20;

    // === ENTRY: RSI bounced from below 35 to above 35 in uptrend ===
    if (!trendBull) return null;
    if (ctx.position === 0) {
        // RSI was below 35 one bar ago (oversold), now recovering above it
        if (rsiPrev < 35 && rsiNow >= 35) {
            entryBar = ctx.i;
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // === EXIT CONDITIONS ===
    if (ctx.position > 0) {
        const barsInTrade = entryBar != null ? ctx.i - entryBar : 0;

        // Exit 1: RSI overbought (momentum exhausted)
        if (rsiNow > 65) {
            entryBar = null;
            return { side: 'sell', qty: ctx.position };
        }

        // Exit 2: Trend broken — price closes below EMA20
        if (ctx.price < ema20) {
            entryBar = null;
            return { side: 'sell', qty: ctx.position };
        }

        // Exit 3: Max hold 24 bars — prevents indefinite holds in slow chop
        if (barsInTrade >= 24) {
            entryBar = null;
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
