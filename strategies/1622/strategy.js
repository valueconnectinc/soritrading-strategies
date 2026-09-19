/*
 * @coinsori-strategy v1
 * name: BB RSI Volume Mean Reversion v7
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Mean reversion on 4H SOLUSDT. Buys when RSI is oversold (<35),
 * price formally closes at or below the lower Bollinger Band, and
 * volume is above its 20-bar average (confirming the drop is backed
 * by real participation). Sells ONLY when RSI climbs above 65 —
 * no premature exit at the middle band. This lets the full mean
 * reversion unfold rather than cutting winners short.
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
    // 3. Volume above average (confirms the drop has conviction)
    const volConfirm = ctx.vol > avgVol;

    // ── Exit condition ─────────────────────────────────────────────────
    // RSI overbought (>65): mean reversion complete, take profit
    const rsiHot = rsi > 65;

    // ── BUY ─────────────────────────────────────────────────────────────
    if (ctx.position === 0 && rsiOversold && atLowerBand && volConfirm) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── SELL ───────────────────────────────────────────────────────────
    if (ctx.position > 0 && rsiHot) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
