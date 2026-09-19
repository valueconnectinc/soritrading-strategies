/*
 * @coinsori-strategy v1
 * name: EMA200 Pullback Trend Following
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Trend-following pullback strategy — trades BOTH directions using EMA200 as both
 * regime filter and entry trigger. The key insight: in a trending market, price
 * rarely gets RSI-oversold, but it DOES pull back to the EMA200. That pullback IS
 * the entry signal.
 *
 * In bull mode (price > EMA200): wait for price to pull back WITHIN 3% of EMA200,
 * then buy on the bounce. Stop if price closes below EMA200.
 * In bear mode (price < EMA200): wait for price to pull back WITHIN 3% of EMA200,
 * then short on the bounce. Stop if price closes above EMA200.
 * Max hold: 96h (24 bars) to avoid indefinite holds.
 *
 * When it buys and sells:
 *   Long: price above EMA200 AND within 3% below it AND price bounces (current > prev).
 *   Short: price below EMA200 AND within 3% above it AND price bounces down (current < prev).
 *   Exit: stop-loss on EMA200 cross, OR take-profit when price moves 5% away, OR max hold.
 *
 * When it does NOT work:
 *   Whipsaw markets where price oscillates around EMA200 without trending.
 *   Fast pumps/dumps where the pullback never materializes cleanly.
 */
function onUpdate(ctx) {
    const price    = ctx.price;
    const ema200   = ctx.ema(200);
    const ema20    = ctx.ema(20);
    const prevC    = ctx.closes[1];   // previous close
    const pos       = ctx.position;
    const openOrds  = ctx.openOrders();

    // Warm-up: EMA200 needs ~200 bars
    if (ema200 == null || ema20 == null) return null;

    // ── Regime ────────────────────────────────────────────────────────────────
    const bull = price > ema200;

    // ── Position management ─────────────────────────────────────────────────
    if (pos !== 0) {
        // Stop-loss: EMA200 cross
        if (pos > 0 && price < ema200) return { side: 'sell', qty: pos };
        if (pos < 0 && price > ema200) return { side: 'buy',  qty: Math.abs(pos) };

        // Max hold: 24 bars (~96h)
        const entryBar = (ctx.entryPx != null) ? ctx.entryPx.bar : null;
        const barsHeld = (entryBar != null) ? ctx.i - entryBar : 999;
        if (barsHeld >= 24) {
            return { side: pos > 0 ? 'sell' : 'buy', qty: pos > 0 ? pos : Math.abs(pos) };
        }

        // Take-profit: 5% move from entry price
        const entryPx = (ctx.entryPx != null) ? ctx.entryPx.price : null;
        if (entryPx != null) {
            const pnlPct = (price - entryPx) / entryPx;
            if (pos > 0 && pnlPct >= 0.05) return { side: 'sell', qty: pos };
            if (pos < 0 && pnlPct <= -0.05) return { side: 'buy', qty: Math.abs(pos) };
        }

        return null;   // hold
    }

    if (openOrds.length > 0) return null;   // don't pile orders

    // ── Entry: pullback to EMA200 + bounce confirmation ───────────────────────
    // Pullback zone: price within 3% of EMA200
    const pullbackZone = Math.abs(price - ema200) / ema200 <= 0.03;

    if (bull && pullbackZone && price > prevC) {
        // Bull bounce — price recovering from near EMA200 support
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    if (!bull && pullbackZone && price < prevC) {
        // Bear bounce-down — price recovering from near EMA200 resistance
        return { side: 'sell', qty: ctx.cash / price * 0.99 };
    }

    return null;
}
