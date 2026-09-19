/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion + ATR Filter ETH
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 1000
 *
 * Buys when price bounces from lower Bollinger Band with RSI confirming
 * oversold, then sells at the middle band. Aims to capture mean-reversion
 * bounces while avoiding choppy markets with an ATR volatility filter.
 * No shorting — only goes long. Designed to avoid the "fade the uptrend"
 * trap that killed the previous EMA200 pullback strategy.
 * When it buys and sells: buy when price touches lower BB and RSI < 30;
 * sell when price reaches middle BB or RSI > 70.
 * When it does NOT work: fails in strong sustained downtrends (every bounce
 * is a trap) and in low-volatility squeeze periods where BB narrows and
 * signals rarely fire.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────
    const bb    = ctx.bb(20, 2);
    const rsi   = ctx.rsi(14);
    const atr   = ctx.atr(14);
    const sma20 = ctx.sma(20);
    const price = ctx.price;

    // Warm-up guard
    if (!bb || !rsi || !atr || !sma20) return null;

    // ── Volatility filter: skip entries when ATR is unusually low ───────────
    // This prevents trading in BB squeeze / low-volatility chop
    const atrVal = atr;
    const priceRef = price;
    const atrRatio = atrVal / priceRef;

    // Require ATR > 0.5% of price — skip calm markets
    if (atrRatio < 0.005) return null;

    // ── Position sizing ──────────────────────────────────────────────────────
    const pos       = ctx.position;
    const cash      = ctx.cash;
    const buyQty    = (cash * 0.9) / price;
    const lowerBand = bb.lower;
    const midBand   = bb.mid;

    // ── Entry: price at or below lower BB AND RSI oversold ──────────────────
    if (pos === 0) {
        if (price <= lowerBand && rsi < 30) {
            return { side: 'buy', qty: buyQty };
        }
        return null;
    }

    // ── Exit: price reached mid BB OR RSI overbought ────────────────────────
    if (pos > 0) {
        // Sell at middle band — mean-reversion target hit
        if (price >= midBand) {
            return { side: 'sell', qty: pos };
        }
        // Or if RSI stretched too far the other way (no overbought in crypto)
        if (rsi > 75) {
            return { side: 'sell', qty: pos };
        }
        // Stop-loss: price dropped 2.5 * ATR below entry (aggressive stop)
        const entryPx = ctx.entryPx;
        const stopPx  = entryPx * 0.97; // hard 3% stop
        if (price <= stopPx) {
            return { side: 'sell', qty: pos };
        }
        return null;
    }

    return null;
}
