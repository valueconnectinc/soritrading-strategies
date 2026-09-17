/*
 * @coinsori-strategy v1
 * name: ATR Trailing Stop Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ATR-based trailing stops lock in profits during volatile
 * BTC swings while letting winners run. Combined with EMA trend direction and
 * volume confirmation, it catches medium-term momentum moves without needing
 * any external data.
 *
 * When it buys and sells: Buy when price crosses above EMA-21 (trend flips bullish)
 * with above-average volume and RSI confirming momentum (40–70 zone, not overheated).
 * Exit when price closes below the ATR trailing stop (computed from 14-period ATR × 3).
 * No take-profit target — the trailing stop handles both profit-taking and loss-cutting.
 *
 * When it does NOT work: In choppy markets where price whipsaws around the EMA —
 * the trailing stop gets hit repeatedly for small losses. Also fails in slow grinding
 * uptrends where ATR compresses and the stop becomes too tight.
 */

function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────
    const ema21  = ctx.ema(21);
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);
    const price  = ctx.price;
    const avgVol = ctx.avgVol(20);

    // Warm-up guard
    if (ema21 == null || rsi == null || atr == null || avgVol == null || avgVol === 0) return null;

    const hasPos = ctx.position > 0;

    // ── Entry: EMA trend flip + volume surge + RSI in healthy range ─────────
    // ago=1 reads the closed previous bar; ago=2 = bar before that
    const ema21_1 = ctx.ema(21, 1);
    const vol     = ctx.vol || 0;
    const volSurge = vol > avgVol * 1.2;   // volume 20% above 20-bar average

    if (ema21_1 == null) return null;

    const emaCrossUp  = price > ema21 && ema21_1 <= ema21; // price crosses above EMA
    const rsiHealthy  = rsi > 40 && rsi < 70;               // not oversold, not overheated
    const trendConfirm = price > ema21;                     // already above EMA (not mid-cross)

    if (!hasPos && emaCrossUp && rsiHealthy && trendConfirm && volSurge) {
        return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.99 };
    }

    // ── ATR Trailing Stop ──────────────────────────────────────────────────
    // Stop level = price - 3 × ATR (gives breathing room for normal swings)
    const stopLevel = price - 3 * atr;

    if (hasPos) {
        // On first entry, initialise the trailing stop in state
        const trailStop = (ctx.state._trailStop == null || ctx.state._trailStop === 0)
            ? stopLevel
            : ctx.state._trailStop;

        // Trail: stop only moves UP (in favour of the trade), never down
        const newTrail = Math.max(trailStop, stopLevel);

        // Update state so it persists across bars
        ctx.state._trailStop = newTrail;

        // Exit when price closes below the trailing stop
        if (price < newTrail) {
            return { side: 'sell', qty: ctx.position };
        }
    } else {
        // No position — reset the trailing stop so it recalculates cleanly on next entry
        ctx.state._trailStop = 0;
    }

    return null;
}
