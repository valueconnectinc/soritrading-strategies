/*
 * @coinsori-strategy v1
 * name: RSI-2 Profit Target Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * RSI(2) mean reversion with PRICE-BASED exit instead of RSI overbought.
 * Original (1045) exits at RSI(2) > 70 — but in strong uptrends RSI never
 * reaches 70, so the trade holds too long and gives back profits.
 * This version exits at 15% profit target OR 8-bar timeout.
 * Keeps RSI(2) < 20 entry + EMA200 trend filter (proven to work).
 *
 * When it buys and sells: Buy at RSI(2) < 20 with price above EMA200;
 * sell at 15% profit or after 8 bars. Aims to capture quick snaps.
 *
 * When it does NOT work: In slow grinding uptrends where price takes
 * weeks to reach 15% — the 8-bar timeout exits too early.
 */
function onUpdate(ctx) {
    const rsi2 = ctx.rsi(2);
    if (rsi2 == null) return null;

    const ema200 = ctx.ema(200);
    if (ema200 == null) return null;

    const price  = ctx.price;
    const inPos  = ctx.position > 0;
    const noPos  = ctx.position <= 0;

    // ── BUY: RSI(2) < 20 + price above EMA200 ──────────────────────────────
    if (noPos && rsi2 < 20 && price > ema200) {
        // Store entry price in state for profit-target tracking
        const s = ctx.state;
        s.entryPx = price;
        s.barsHeld = 0;
        return {
            side: 'buy',
            qty: ctx.cash / price * 0.99,
            type: 'limit',
            price: price
        };
    }

    // ── SELL: 15% profit target OR 8-bar timeout ───────────────────────────
    if (inPos) {
        const s   = ctx.state;
        const ep  = s.entryPx || ctx.entryPx;
        const ret = (price - ep) / ep;

        s.barsHeld = (s.barsHeld || 0) + 1;

        // Exit on 15% profit
        if (ret >= 0.15) {
            s.entryPx = 0;
            s.barsHeld = 0;
            return { side: 'sell', qty: ctx.position };
        }

        // Exit on 8-bar timeout (faster than original's 12)
        if (s.barsHeld > 8) {
            s.entryPx = 0;
            s.barsHeld = 0;
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
