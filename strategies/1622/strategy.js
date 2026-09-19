/*
 * @coinsori-strategy v1
 * name: BB RSI Volume Mean Reversion v6
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean reversion on 4H SOLUSDT. Buys when RSI is oversold (<35),
 * price formally closes at or below the lower Bollinger Band, and
 * volume surges to 1.5x its 20-bar average (strong conviction behind the drop).
 * Sells when price reaches the middle BB or RSI climbs above 55 (softer
 * overbought threshold than 60 — takes profit earlier).
 * Works best in range-bound and choppy markets; loses badly in strong
 * sustained one-directional moves where RSI stays extreme.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────
    const rsi    = ctx.rsi(14, 0);   // current (forming) bar RSI
    const rsi_1  = ctx.rsi(14, 1);   // confirmed bar RSI
    const bb     = ctx.bb(20, 2, 0); // current BB
    const bb_1   = ctx.bb(20, 2, 1); // confirmed bar BB
    const avgVol = ctx.avgVol(20);

    if (rsi == null || rsi_1 == null || bb == null || bb_1 == null ||
        avgVol == null || avgVol === 0) {
        return null;
    }

    const price  = ctx.price;        // live mid price
    const close1 = ctx.closes[1];    // confirmed close (bar 1 ago)
    if (close1 == null) return null;

    // ── Entry conditions (ALL must be true) ────────────────────────────
    // 1. RSI oversold on confirmed bar
    const rsiOversold = rsi_1 < 35;
    // 2. Price at/below lower BB on confirmed bar (formal touch)
    const atLowerBand = close1 <= bb_1.lower;
    // 3. Volume surge: 1.5x the 20-bar average (strong conviction)
    const volSurge = ctx.vol >= avgVol * 1.5;

    // ── Exit conditions ─────────────────────────────────────────────────
    // Exit 1: price reached middle BB — mean reversion target hit
    // Exit 2: RSI overbought (>55) — softer threshold than 60, exits earlier
    const atMidBand  = price >= bb.mid;
    const rsiHot     = rsi > 55;

    // ── BUY ─────────────────────────────────────────────────────────────
    if (ctx.position === 0 && rsiOversold && atLowerBand && volSurge) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── SELL ────────────────────────────────────────────────────────────
    if (ctx.position > 0) {
        if (atMidBand || rsiHot) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
