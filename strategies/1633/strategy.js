/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + RSI Confirm
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Different family from EMA+RSI pullback — BB mean-reversion
 * buys when price bounces off the lower Bollinger Band (oversold), not when RSI
 * hits a fixed level. This catches deeper dips that RSI-only strategies miss in
 * bull markets. RSI confirms the bounce so we're not catching a falling knife.
 * When it buys and sells: BUY when price crosses above the lower BB band while
 * RSI > 30 (bounce confirmed, not extended) and RSI is rising (1 > 2). SELL
 * when price reaches the middle BB band (mean) OR RSI > 70 (overbought).
 * When it does NOT work: in strong downtrends where price hugs the lower band
 * — multiple false bounces. Also fails in low-volatility regimes where bands
 * compress and generate whipsaws.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────
    const rsi_1 = ctx.rsi(14, 1);
    const rsi_2 = ctx.rsi(14, 2);
    const bb_1  = ctx.bb(20, 2, 1);
    const close1 = ctx.closes[1];

    if (rsi_1 == null || rsi_2 == null || bb_1 == null || close1 == null) {
        return null;
    }

    const { lower, middle } = bb_1;

    // ── Entry: price bounced off lower BB and RSI confirms ───────────────
    // Price crosses above lower band = bounce from oversold territory.
    // RSI > 30 = bounce is real, not extended. RSI rising = momentum building.
    const priceBouncedOffLower = close1 > lower;
    const rsiBounceConfirm     = rsi_1 > 30 && rsi_1 > rsi_2;
    const notInPosition        = ctx.position === 0;

    // ── Exit: price at middle BB (mean) or RSI overbought ────────────────
    const priceAtMean   = close1 >= middle;
    const rsiOverbought = rsi_1 > 70;

    // ── BUY ─────────────────────────────────────────────────────────────
    if (notInPosition && priceBouncedOffLower && rsiBounceConfirm) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── SELL ────────────────────────────────────────────────────────────
    if (ctx.position > 0 && (priceAtMean || rsiOverbought)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
