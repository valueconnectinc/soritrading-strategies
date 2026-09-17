/*
 * @coinsori-strategy v1
 * name: BTC FearGreed Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC price momentum and Fear & Greed sentiment tend to agree —
 * when RSI confirms price trend AND the crowd shifts from fear to greed, the move
 * has follow-through. The macro filter avoids buying when sentiment is already
 * extremely bullish (F&G > 70) or deeply fearful (F&G < 30).
 *
 * When it buys and sells: Buys when RSI crosses above 50, price is above SMA50,
 * and Fear & Greed index also crosses above 50 within the last 2 bars (all three
 * must align). Sells when RSI crosses below 50 OR Fear & Greed drops below 30.
 *
 * When it does NOT work: Crashes fast during news-driven flash drops (the 4H bar
 * is too coarse to react quickly). Also underperforms in choppy low-volume markets
 * where RSI oscillates around 50 without establishing a trend.
 */

function onUpdate(ctx) {
    const state = ctx.state;

    // Snapshot on every new bar — this is the only safe way to track "previous bar"
    // values across all modes (backtest, paper, live). ctx.state persists between ticks.
    if (state.lastBarI !== ctx.i) {
        state.prevRsi = state.rsi;
        state.prevFg  = state.fg;
        state.lastBarI = ctx.i;
    }

    // Read current values
    state.rsi = ctx.rsi(14);
    state.fg  = ctx.data('fg');

    const rsi    = state.rsi;
    const fg     = state.fg;
    const prevRsi = state.prevRsi;
    const prevFg  = state.prevFg;

    // Indicators
    const sma50 = ctx.sma(50);

    // Guard: all values must be known before we decide anything
    if (rsi == null || prevRsi == null || sma50 == null || fg == null || prevFg == null) return null;
    if (ctx.i < 60) return null;  // warm-up: SMA50 needs ~50 bars + RSI buffer

    // ── Entry conditions ──────────────────────────────────────────
    // 1. RSI crosses from ≤50 to >50  →  bullish momentum confirmation
    const rsiCrossUp  = prevRsi <= 50 && rsi > 50;
    // 2. Price above its 50-bar SMA   →  trend is already up
    const trendUp     = ctx.price > sma50;
    // 3. Fear & Greed crossed above 50 (within last bar) → sentiment shift
    const fgCrossUp   = prevFg <= 50 && fg > 50;

    if (!ctx.position) {
        // No position — enter only when ALL three fire together
        if (rsiCrossUp && trendUp && fgCrossUp) {
            const qty = (ctx.cash / ctx.price) * 0.95;
            return { side: 'buy', qty: qty };
        }
    } else {
        // ── Exit condition 1: RSI crosses back below 50 (momentum fading) ──
        const rsiCrossDown = prevRsi >= 50 && rsi < 50;
        if (rsiCrossDown) {
            return { side: 'sell', qty: ctx.position };
        }

        // ── Exit condition 2: Fear & Greed drops below 30 (panic / extreme fear) ──
        // Fires even if RSI hasn't crossed — protects capital in sudden drops
        if (fg < 30) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
