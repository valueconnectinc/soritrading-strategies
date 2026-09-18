/*
 * @coinsori-strategy v1
 * name: EMA 9/21 Crossover + OI Trend v1
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Trend-following on daily BTC using EMA 9/21 crossover — a fundamentally
 * different family from the RSI(2) mean-reversion that failed in every
 * window (112-132 trades, deeply negative in bull markets).
 * EMA crossover captures multi-week trends and avoids the micro-jiggle
 * whipsaws that plagued RSI(2) on daily (fires every 3 days).
 * OI crash detection exits early when open interest collapses (smart money
 * is distributing). ATR stop prevents runaway losses.
 * When it buys: EMA 9 crosses above EMA 21 in a confirmed uptrend
 * (BTC above EMA200). No OI crash.
 * When it sells: EMA 9 crosses below EMA 21, OR OI crash (immediate),
 * OR ATR stop 3×, OR 90-bar timeout.
 * When it does NOT work: choppy markets where EMAs cross back and forth
 * repeatedly, and in sharp V-shaped reversions where the exit lags.
 */

function onUpdate(ctx) {
    const state  = ctx.state ?? {};
    const curBar = ctx.i;

    if (state.lastBarI !== curBar) {
        state.prevEma9  = state.snapEma9  ?? null;
        state.snapEma9  = ctx.ema(9);
        state.prevEma21 = state.snapEma21 ?? null;
        state.snapEma21 = ctx.ema(21);
        state.prevOi    = state.snapOi    ?? null;
        state.snapOi    = ctx.binanceOi();
        state.lastBarI  = curBar;
        ctx.state = state;
    }

    const ema200 = ctx.ema(200);
    const ema9   = ctx.ema(9);
    const ema21  = ctx.ema(21);
    const atr    = ctx.atr(14);

    if (ema200 == null || ema9 == null || ema21 == null || atr == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;
    const entry = ctx.entryPx;

    const ema9Now  = state.snapEma9;
    const ema9Prev = state.prevEma9;
    const ema21Now  = state.snapEma21;
    const ema21Prev = state.prevEma21;
    if (ema9Now == null || ema9Prev == null || ema21Now == null || ema21Prev == null) return null;

    // EMA crossover signals
    const emaCrossUp  = ema9Prev <= ema21Prev && ema9Now > ema21Now;
    const emaCrossDn  = ema9Prev >= ema21Prev && ema9Now < ema21Now;

    // OI crash detection
    const oiNow  = state.snapOi;
    const oiPrev = state.prevOi;
    let oiCrash = false;
    if (oiNow != null && oiPrev != null && oiPrev > 0) {
        oiCrash = (oiNow - oiPrev) / oiPrev < -0.15;
    }

    const bullTrend = price > ema200;

    // ── ENTRY: EMA golden cross in confirmed uptrend ──────────────────
    const trendBuy = emaCrossUp && bullTrend && !oiCrash;

    if (trendBuy && pos === 0) {
        const riskAmt = ctx.cash * 0.02;
        const qty     = riskAmt / atr;
        ctx.log(`BUY  EMA_CrossUp  qty=${qty.toFixed(4)}  price=${price}  EMA9=${ema9.toFixed(1)}  EMA21=${ema21.toFixed(1)}`);
        return { side: 'buy', qty: qty };
    }

    // ── EXIT 1: OI crash — immediate exit ────────────────────────────
    if (oiCrash && pos > 0) {
        ctx.log(`SELL OI_Crash  price=${price}`);
        return { side: 'sell', qty: pos };
    }

    // ── EXIT 2: EMA death cross ───────────────────────────────────────
    const deathCross = emaCrossDn;

    // ── EXIT 3: ATR stop 3× ───────────────────────────────────────────
    const hardStop = entry > 0 && (entry - price) > atr * 3.0;

    if ((deathCross || hardStop) && pos > 0) {
        const reason = hardStop ? 'atr-stop' : 'ema-cross-dn';
        ctx.log(`SELL ${reason}  qty=${pos}  price=${price}  EMA9=${ema9.toFixed(1)}  EMA21=${ema21.toFixed(1)}`);
        return { side: 'sell', qty: pos };
    }

    // ── EXIT 4: 90-bar (~90-day) timeout ──────────────────────────────
    const symState = ctx.symState;
    const entryBar = symState?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 90) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}
