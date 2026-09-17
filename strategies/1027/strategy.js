/*
 * @coinsori-strategy v1
 * name: RSI-2 Mean Reversion Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC is famous for sharp oversold bounces — RSI(2) catches
 * the micro-pullbacks within an uptrend and buys the reversal before the crowd.
 * A 200-day SMA trend filter keeps us from catching falling knives in bear
 * markets. This is a completely different family from the momentum strategies
 * tested so far, giving us regime diversification.
 *
 * When it buys and sells: Buys when RSI(2) < 30 AND price is above SMA(200)
 * (uptrend confirmed). Sells when RSI(2) crosses above 65 (mean reversion
 * complete) or if price closes below SMA(200) (trend broken).
 *
 * When it does NOT work: In strong one-way bear trends, RSI(2) stays
 * oversold for weeks — the strategy keeps buying into a falling knife.
 * Also underperforms in low-volatility chop where RSI oscillates but never
 * triggers entry.
 */

function onUpdate(ctx) {
    const state = ctx.state;

    // Snapshot previous bar on each new bar
    if (state.lastBarI !== ctx.i) {
        state.prevRsi2 = state.rsi2;
        state.lastBarI = ctx.i;
    }

    state.rsi2 = ctx.rsi(2);

    const rsi2    = state.rsi2;
    const prevRsi2 = state.prevRsi2;

    const sma200 = ctx.sma(200);
    const atr    = ctx.atr(14);

    // Warm-up: SMA(200) needs ~200 bars
    if (rsi2 == null || prevRsi2 == null || sma200 == null || atr == null ||
        ctx.i < 210) return null;

    const aboveTrend = ctx.price > sma200;

    if (!ctx.position) {
        // ── Entry: RSI(2) oversold in an uptrend ─────────────────────
        // RSI(2) < 30 means price pulled back hard within the day.
        // Only buy when above SMA(200) to avoid catching falling knives.
        if (rsi2 < 30 && aboveTrend) {
            state.entryPx = ctx.price;
            const qty = (ctx.cash / ctx.price) * 0.95;
            return { side: 'buy', qty: qty };
        }
    } else {
        // ── Exit 1: RSI(2) mean reversion complete (crosses above 65) ─
        // RSI has snapped back — take profit before it stalls.
        const rsiCrossUp = prevRsi2 <= 65 && rsi2 > 65;
        if (rsiCrossUp) return { side: 'sell', qty: ctx.position };

        // ── Exit 2: Trend broken — price closes below SMA(200) ────────
        if (ctx.price < sma200) return { side: 'sell', qty: ctx.position };

        // ── Exit 3: ATR stop — 4× ATR below entry ────────────────────
        // RSI(2) bounces are fast but volatile; 4× ATR gives breathing room.
        const entryPx = state.entryPx || ctx.price;
        const stopPx  = entryPx - 4 * atr;
        if (ctx.price <= stopPx) return { side: 'sell', qty: ctx.position };
    }

    return null;
}
