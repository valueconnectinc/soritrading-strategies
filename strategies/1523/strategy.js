/*
 * @coinsori-strategy v1
 * name: EMA20 Trend Filter + RSI Pullback on MATICUSDT 4H
 * ex: binance
 * syms: MATICUSDT
 * interval: 4h
 * cash: 1000
 *
 * Why this strategy: MATIC (Polygon) moves in clear up/down cycles that the
 * EMA20 trend filter captures well. When price pulls back to the EMA20 line
 * while RSI < 35, it is a high-probability bounce point in a confirmed
 * uptrend. This is the same strategy family that worked on SOL and BTC,
 * now applied to MATIC for symbol diversity.
 * When it buys and sells: Buy when price > EMA20 AND RSI < 35. Sell when
 * price drops below EMA20 OR RSI > 65.
 * When it does NOT work: In low-volume chop where MATIC drifts sideways
 * below EMA20 for months — the strategy waits and produces no trades.
 */
function onUpdate(ctx) {
    const ema20 = ctx.ema(20, 0);
    if (ema20 == null) return null;

    const rsiNow  = ctx.rsi(14, 0);
    const rsiPrev = ctx.rsi(14, 1);
    if (rsiNow == null || rsiPrev == null) return null;

    const atrNow = ctx.atr(14);
    if (atrNow == null) return null;
    // Reject extreme volatility (avoids flash-crash entries)
    if (atrNow / ctx.price > 0.10) return null;

    // ── Entry: uptrend confirmed + RSI oversold pullback ────────────
    if (ctx.position === 0) {
        if (ctx.price > ema20 && rsiNow < 35) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
        return null;
    }

    // ── Exit: trend breaks OR overbought ───────────────────────────
    if (ctx.price < ema20 || rsiNow > 65) {
        return { side: 'sell', qty: ctx.position };
    }

    // ── Stop: 2.5× ATR below entry ─────────────────────────────────
    const drawdown = ctx.entryPx - ctx.price;
    if (drawdown > 0 && drawdown > 2.5 * atrNow) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
