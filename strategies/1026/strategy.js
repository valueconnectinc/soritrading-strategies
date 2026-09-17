/*
 * @coinsori-strategy v1
 * name: BBW Volume Momentum Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Fear & Greed filter in the previous version was
 * too restrictive — it blocked 4 trades per year and left us flat during
 * some of BTC's best months. Replacing it with a Bollinger Band Width (BBW)
 * filter cuts the noise: low BBW means compressing/choppy market, high BBW
 * means an expanding trend. Volume confirmation adds a second filter to reject
 * weak breakouts not backed by real conviction.
 *
 * When it buys and sells: Buys when EMA(9) crosses above EMA(21) AND price
 * above SMA(50) AND RSI > 50 AND BBW is above 60% of its 20-bar average
 * (not a choppy squeeze) AND volume > 1.2× the 20-bar average. Exits on
 * EMA death cross, 3× ATR stop, or RSI dropping below 40.
 *
 * When it does NOT work: In slow grinding markets where BBW never spikes
 * (low-volatility uptrends) the filter stays too tight. Also fails when
 * volume spikes on news rather than genuine trend conviction.
 */

function onUpdate(ctx) {
    const state = ctx.state;

    // Snapshot previous bar on each new bar
    if (state.lastBarI !== ctx.i) {
        state.prevFast = state.fast;
        state.prevSlow = state.slow;
        state.prevRsi  = state.rsi;
        state.lastBarI = ctx.i;
    }

    state.fast = ctx.ema(9);
    state.slow = ctx.ema(21);
    state.rsi  = ctx.rsi(14);

    const fast     = state.fast;
    const slow     = state.slow;
    const prevFast = state.prevFast;
    const prevSlow = state.prevSlow;
    const rsi      = state.rsi;
    const prevRsi  = state.prevRsi;

    const sma50 = ctx.sma(50);
    const atr   = ctx.atr(14);

    // Bollinger Band Width — measures market volatility compression
    const bb     = ctx.bb(20, 2);
    const bbw    = bb ? bb.upper - bb.lower : null;

    // BBW average over 20 bars — used to detect expanding vs compressing
    // markets. We compute it manually from the last 20 closes.
    let bbwAvg = 0;
    let bbwCount = 0;
    for (let i = 0; i < 20; i++) {
        const b = ctx.bb(20, 2, i);
        if (b) {
            bbwAvg += b.upper - b.lower;
            bbwCount++;
        }
    }
    bbwAvg = bbwCount > 0 ? bbwAvg / bbwCount : null;

    // Volume confirmation — reject breakouts on below-average volume
    const avgVol  = ctx.avgVol(20);
    const volOk   = avgVol != null && ctx.vol > avgVol * 1.2;

    // Warm-up guard: need ~50 bars for SMA(50) + BBW warm-up
    if (fast == null || slow == null || prevFast == null || prevSlow == null ||
        rsi == null || prevRsi == null || sma50 == null || atr == null ||
        bbw == null || bbwAvg == null || avgVol == null ||
        ctx.i < 60) return null;

    // BBW filter: only enter when volatility is expanding (BBW > 60% of avg)
    // Below this threshold the market is squeezing — prone to false breakouts.
    const bbwRatio = bbw / bbwAvg;
    const volFilterOk = bbwRatio > 0.6;

    // ── Entry ───────────────────────────────────────────────────────
    const emaCrossUp   = prevFast <= prevSlow && fast > slow;
    const trendConfirm = ctx.price > sma50;
    const momentumOk   = rsi > 50;

    if (!ctx.position) {
        if (emaCrossUp && trendConfirm && momentumOk && volFilterOk && volOk) {
            state.entryPx = ctx.price;
            const qty = (ctx.cash / ctx.price) * 0.95;
            return { side: 'buy', qty: qty };
        }
    } else {
        // ── Exit 1: EMA death cross ──────────────────────────────────
        const emaCrossDown = prevFast >= prevSlow && fast < slow;
        if (emaCrossDown) return { side: 'sell', qty: ctx.position };

        // ── Exit 2: 3× ATR stop ─────────────────────────────────────
        const entryPx = state.entryPx || ctx.price;
        const stopPx  = entryPx - 3 * atr;
        if (ctx.price <= stopPx) return { side: 'sell', qty: ctx.position };

        // ── Exit 3: RSI weakness ────────────────────────────────────
        if (prevRsi >= 40 && rsi < 40) return { side: 'sell', qty: ctx.position };
    }

    return null;
}
