/*
 * @coinsori-strategy v1
 * name: BB RSI Volume Mean Reversion v5
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean reversion on 4H SOLUSDT. Buys when RSI is deeply oversold (<30),
 * price formally closes at or below the lower Bollinger Band, volume surges
 * to 1.5x its 20-bar average, AND price is above its 200-day EMA (no
 * counter-trend entries). Sells when price reaches the middle BB or RSI
 * climbs above 60.
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
    const ema200 = ctx.ema(200, 1);  // confirmed bar EMA200

    if (rsi == null || rsi_1 == null || bb == null || bb_1 == null ||
        avgVol == null || avgVol === 0 || ema200 == null) {
        return null;
    }

    const price  = ctx.price;        // live mid price
    const close1 = ctx.closes[1];    // confirmed close (bar 1 ago)
    if (close1 == null) return null;

    // ── Entry conditions (ALL must be true) ────────────────────────────
    // 1. Deeply oversold: RSI < 30 on confirmed bar (more selective than <35)
    const rsiOversold = rsi_1 < 30;
    // 2. Price at/below lower BB on confirmed bar (formal touch)
    const atLowerBand = close1 <= bb_1.lower;
    // 3. Volume surge: 1.5x the 20-bar average (strong conviction behind the drop)
    const volSurge = ctx.vol >= avgVol * 1.5;
    // 4. EMA200 rising guard: price must be above EMA200 (no counter-trend entries)
    const aboveEma200 = price > ema200;

    // ── Exit conditions ─────────────────────────────────────────────────
    // Exit 1: price reached middle BB — mean reversion target hit
    // Exit 2: RSI overbought (>60) — momentum exhausted
    const atMidBand  = price >= bb.mid;
    const rsiHot     = rsi > 60;

    // ── BUY ─────────────────────────────────────────────────────────────
    if (ctx.position === 0 && rsiOversold && atLowerBand && volSurge && aboveEma200) {
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
