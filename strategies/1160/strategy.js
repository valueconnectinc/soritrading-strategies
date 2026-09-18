/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion — No Filter
 * ex: binance
 * syms: ETHUSDT, BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: ETH/BTC oscillate between oversold and overbought on the 1h chart.
 * RSI < 30 is a reliable mean-reversion buy signal; RSI > 60 is a clean exit.
 * No trend filter — lets the strategy trade both directions in ranging markets.
 * When it buys and sells: Buys when RSI < 30 (extreme oversold). Sells when RSI > 60
 * or after 5% profit, whichever comes first.
 * When it does NOT work: In strong trending markets (2024-2025 BTC bull run) — RSI stays
 * overbought for weeks and the strategy buys too early repeatedly.
 */
function onUpdate(ctx) {
    const rsi  = ctx.rsi(14);
    const price = ctx.price;
    if (rsi == null) return null;

    // ── Entry: RSI oversold ──────────────────────────────────────────────────
    if (ctx.position === 0 && rsi < 30) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Exit: RSI overbought OR 5% profit ─────────────────────────────────────
    if (ctx.position > 0) {
        const entryPx = ctx.entryPx;
        const pnlPct  = (price - entryPx) / entryPx;
        if (rsi > 60 || pnlPct >= 0.05) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
