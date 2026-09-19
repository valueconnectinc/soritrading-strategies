/*
 * @coinsori-strategy v1
 * name: EMA20 Rising + RSI40 Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Buys SOLUSDT 4H when: (1) EMA20 is rising (trend guard), (2) RSI drops
 * below 40 on the confirmed bar (pullback entry), (3) price closes above EMA20
 * (not too far extended). Sells when RSI climbs above 60.
 * This is the proven capital-preservation setup — Exp 382 showed all 3 walk-
 * forward windows beat benchmarks (W1: -4.97% vs -24.86%, W2: -1.79% vs -43.5%,
 * W3: -4.52% vs -10.67%). EMA20 rising is the non-negotiable filter that
 * prevents the catastrophic whipsaws seen without it (Exp 381: 172-256 trades,
 * MDD 46-62%).
 * When it does NOT work: strong sustained SOL rallies where RSI never drops
 * below 40 — the strategy sits in cash and misses the move.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────
    const ema20  = ctx.ema(20, 0);  // current EMA20
    const ema20_1 = ctx.ema(20, 1); // EMA20 1 bar ago (to check rising)
    const rsi_1  = ctx.rsi(14, 1);  // confirmed bar RSI
    const rsi    = ctx.rsi(14, 0);  // current (forming) bar RSI
    const close1 = ctx.closes[1];  // confirmed close

    if (ema20 == null || ema20_1 == null || rsi == null || rsi_1 == null || close1 == null) {
        return null;
    }

    const price = ctx.price;

    // ── Trend filter: EMA20 must be rising ─────────────────────────────
    // Rising EMA20 = market in short-term uptrend. Without this, RSI-only
    // entries cause catastrophic whipsaws (Exp 381: 172-256 trades, MDD 46-62%).
    const emaRising = ema20 > ema20_1;

    // ── Entry: RSI<40 pullback while EMA20 is rising ───────────────────
    // RSI<40 = oversold pullback from trend. Higher threshold than the
    // oversold extremes (<30) to get more entries while staying selective.
    // RSI must be confirmed (bar 1) to avoid trading on forming data.
    const rsiPullback = rsi_1 < 40;

    // Price must be above EMA20 — if it has dropped below, the pullback
    // may be the start of a reversal, not a buying opportunity.
    const aboveEMA = close1 > ema20;

    // ── Exit: RSI>60 (overbought / mean reversion complete) ────────────
    const rsiOverbought = rsi > 60;

    // ── BUY ─────────────────────────────────────────────────────────────
    if (ctx.position === 0 && emaRising && rsiPullback && aboveEMA) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── SELL ───────────────────────────────────────────────────────────
    if (ctx.position > 0 && rsiOverbought) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
