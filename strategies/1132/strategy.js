/*
 * @coinsori-strategy v1
 * name: Bollinger Mean Reversion + Volume
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Same core as the base Bollinger Mean Reversion but adds a volume confirmation
 * filter: the bounce must occur on above-average volume (1.2× the 20-bar average).
 * This filters out weak bounces that fail to sustain. Also uses a tighter 1.5×
 * ATR stop to protect capital more aggressively.
 *
 * Buys when: price touches lower BB AND price > EMA(200) AND RSI < 40 AND
 *            volume > 1.2 × avgVol(20).
 * Sells when: RSI > 60, 1.5× ATR stop-loss, or 24-bar time stop.
 *
 * When it does NOT work: In low-volume markets where legitimate bounces still
 * occur but on below-average volume — misses good entries. The tighter stop
 * can exit winners prematurely in slow-moving bounces.
 */
function onUpdate(ctx) {
    const ema200 = ctx.ema(200);
    if (ema200 == null) return null;

    const bb = ctx.bb(20, 2);
    if (bb == null || bb.lower == null) return null;

    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const atr = ctx.atr(14);
    if (atr == null) return null;

    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;

    const price = ctx.price;

    // ── ENTRY ────────────────────────────────────────────────────────────────
    if (ctx.position === 0) {
        const atLowerBand = price <= bb.lower;
        const trendUp = price > ema200;
        const oversold = rsi < 40;
        // Volume confirmation: bounce needs fuel
        const volumeConfirm = ctx.vol > avgVol * 1.2;

        if (atLowerBand && trendUp && oversold && volumeConfirm) {
            return {
                side: 'buy',
                qty: ctx.cash / price * 0.98,
                type: 'limit',
                price: price,
                postOnly: true,
            };
        }
    }

    // ── EXIT ─────────────────────────────────────────────────────────────────
    if (ctx.position > 0) {
        // Exit 1: RSI overbought
        if (rsi > 60) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 2: ATR stop-loss (1.5× ATR — tighter than base)
        const entryPx = ctx.entryPx;
        if (entryPx != null) {
            const stopPx = entryPx - 1.5 * atr;
            if (price < stopPx) {
                return { side: 'sell', qty: ctx.position };
            }
        }
        // Exit 3: time stop — 24 bars (~4 days)
        if (ctx.i > 0 && ctx.i % 24 === 0) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
