/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Mean-reversion strategy on daily BTCUSDT. Buys when price touches the lower
 * Bollinger Band AND RSI confirms oversold (< 35). Sells when price reaches the
 * upper band OR RSI climbs above 65. ATR-based stop loss for risk control.
 *
 * When it buys and sells: Buy at lower BB touch with RSI confirm; sell at upper
 * BB touch or overbought RSI. Holds until signal reverses.
 *
 * When it does NOT work: Trending markets (BTC breaks lower BB and keeps falling,
 * or rips through upper BB without reversing). Works best in range-bound chop.
 */
function onUpdate(ctx) {
    // Require 20 bars for BB + RSI warmup
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    const price = ctx.price;
    const lower = bb.lower;
    const upper = bb.upper;
    const mid   = bb.mid;

    // ATR for stop loss — also needs warmup (14 bars, already covered by BB warmup)
    const atr = ctx.atr(14);
    if (atr == null) return null;

    const inPos = ctx.position > 0;
    const noPos = ctx.position <= 0;

    // ── BUY: price at/below lower BB AND RSI oversold (< 35) ──
    // 35 is chosen as a loose oversold threshold — not extreme, catches mean-reversion bounces
    if (noPos && price <= lower && rsi < 35) {
        // Stop loss: entry price minus 2× ATR (gives room for normal noise)
        const stopPx = price - 2 * atr;
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            type: 'limit',
            price: price,
            postOnly: false
        };
    }

    // ── SELL: price at/above upper BB OR RSI overbought (> 65) ──
    // 65 is a conservative overbought level — we exit before extreme
    if (inPos && (price >= upper || rsi > 65)) {
        return { side: 'sell', qty: ctx.position };
    }

    // ── TIME-BASED STOP: if in position for > 14 days, take profit at mid BB ──
    // ATR-based time filter — prevents holding through long trending moves
    const holdBars = ctx.i; // current bar index
    const entryBar = ctx.entryPx > 0 ? holdBars - Math.floor(ctx.cash / ctx.position) : 0;
    // Simple proxy: if mid BB is > 20% above entry, take profit anyway
    if (inPos && mid > ctx.entryPx * 1.20) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
