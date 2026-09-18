/*
 * @coinsori-strategy v1
 * name: Dual Oscillator v3 — ATR Trailing Stop (no volume filter)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: v2's volume filter (vol > avgVol20) was too restrictive — only
 * 2-4 trades per window vs v1's 20+. v3 reverts to v1's pure dual-oscillator entry
 * and adds only the ATR trailing stop for profit protection, using only built-in ctx
 * values (entryPx, uPnl) — no custom state variables.
 * When it buys and sells: Same as v1 — RSI < 35 AND Stoch %K < 25 AND above EMA200.
 * Sells on RSI > 55, Stoch > 60, EMA200 break, or ATR trailing stop activation.
 * When it does NOT work: Same as v1 — misses single-oscillator setups.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────
    const ema200 = ctx.ema(200);
    const rsi    = ctx.rsi(14);
    const sto    = ctx.stoch(14, 3);
    const atr    = ctx.atr(14);
    if (ema200 == null || rsi == null || sto == null || sto.k == null || atr == null) return null;

    const price      = ctx.price;
    const aboveEMA   = price > ema200;

    // ── Entry: dual oversold + trend (no volume filter — v2 was too strict) ─
    if (ctx.position === 0 && rsi < 35 && sto.k < 25 && aboveEMA) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Exit conditions ──────────────────────────────────────────────────────
    if (ctx.position > 0) {
        // Tighter exits: RSI 55 (was 60), Stoch 60 (was 65)
        if (rsi > 55) return { side: 'sell', qty: ctx.position };
        if (sto.k > 60) return { side: 'sell', qty: ctx.position };

        // Trend break
        if (!aboveEMA) return { side: 'sell', qty: ctx.position };

        // ATR trailing stop: if unrealized PnL > 1×ATR, trail at entry + 0.5×ATR
        // Uses only built-in ctx values — no custom state storage needed
        const entryPx = ctx.entryPx;
        if (ctx.uPnl > atr * ctx.position) {
            const trailLevel = entryPx + atr * 0.5;
            if (price < trailLevel) return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
