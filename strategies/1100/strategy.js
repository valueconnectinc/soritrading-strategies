/*
 * @coinsori-strategy v1
 * name: SuperTrend Momentum + ATR Trail Stop
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * SuperTrend momentum strategy — a different signal family from RSI/OI.
 * SuperTrend uses ATR in a price-channel construction: it flips bullish/
 * bearish based on whether price closes beyond the channel, making it
 * self-adapting to volatility. Combined with ATR trailing stop for exits.
 * Why this: unlike RSI (oscillator-based), SuperTrend is trend-channel based
 * and naturally catches big trending moves while avoiding choppy ranges.
 * When it buys: SuperTrend flips from bearish to bullish (trend reversal signal).
 * When it sells: SuperTrend flips back to bearish OR ATR trailing stop hit.
 * When it does NOT work: in tight ranges where SuperTrend flips frequently
 * (choppy market whipsaw), and in sharp one-bar reversals that close back
 * inside the channel before the stop triggers.
 */

function onUpdate(ctx) {
    const state   = ctx.state ?? {};
    const curBar  = ctx.i;

    // ── SuperTrend state (needs previous bar's ST value) ──────────────
    if (state.lastBarI !== curBar) {
        state.prevST = state.snapST ?? null;
        state.snapST = computeSuperTrend(ctx, 10, 3.0);  // period=10, multiplier=3
        state.lastBarI = curBar;
        ctx.state = state;
    }

    const stNow  = state.snapST;
    const stPrev = state.prevST;
    if (stNow == null || stPrev == null) return null;

    const price  = ctx.price;
    const pos    = ctx.position;
    const atr    = ctx.atr(14);
    const ema50  = ctx.ema(50);

    if (atr == null || ema50 == null) return null;

    // ── Entry: SuperTrend flip bearish → bullish ───────────────────────
    const stFlipUp = stPrev < 0 && stNow > 0;  // was down, now up = bullish flip
    // Confirm with price above EMA50 to avoid false flips in downtrends
    const bullConfirm = price > ema50;

    if (stFlipUp && bullConfirm && pos === 0) {
        const riskAmt = ctx.cash * 0.02;
        const qty     = riskAmt / atr;
        ctx.log(`BUY  ST_Flip_Up  qty=${qty.toFixed(4)}  price=${price}  ST=${stNow.toFixed(2)}`);
        return { side: 'buy', qty: qty };
    }

    // ── Exit: SuperTrend flip bullish → bearish ────────────────────────
    const stFlipDn = stPrev > 0 && stNow < 0;  // was up, now down = bearish flip

    if (stFlipDn && pos > 0) {
        ctx.log(`SELL ST_Flip_Dn  qty=${pos}  price=${price}  ST=${stNow.toFixed(2)}`);
        return { side: 'sell', qty: pos };
    }

    // ── ATR trailing stop (secondary exit) ─────────────────────────────
    const entry = ctx.entryPx;
    if (pos > 0 && entry > 0) {
        // Trail stop: move stop up as price rises, never move down
        const trailStop = state.trailStop ?? (entry + atr * 2);
        const newTrail   = Math.max(trailStop, price - atr * 2);
        state.trailStop  = newTrail;

        if (price < newTrail) {
            ctx.log(`SELL ATR_Trail  qty=${pos}  price=${price}  trail=${newTrail.toFixed(2)}`);
            state.trailStop = null;
            ctx.state = state;
            return { side: 'sell', qty: pos };
        }
        ctx.state = state;
    }

    return null;
}

// ── SuperTrend calculation ───────────────────────────────────────────────────
// period: ATR lookback, multiplier: band width
// Returns positive value = bullish ST level, negative = bearish ST level
function computeSuperTrend(ctx, period, multiplier) {
    const atr = ctx.atr(period);
    if (atr == null) return null;

    const price  = ctx.price;
    const high   = ctx.high(1);   // previous bar's high (closed)
    const low    = ctx.low(1);    // previous bar's low  (closed)

    // HL2 = typical price of previous bar
    const hl2 = (high + low) / 2;
    const upperBand = hl2 + multiplier * atr;
    const lowerBand = hl2 - multiplier * atr;

    // Use state to track prior ST value and prior bands
    const state = ctx.state ?? {};
    const key   = `st_p${period}_m${multiplier}`;
    const prev  = state[key] ?? {};

    const prevST  = prev.st  ?? price;   // default to price on first bar
    const prevUB  = prev.ub  ?? upperBand;
    const prevLB  = prev.lb  ?? lowerBand;

    let st, ub, lb;
    if (prevST > prevUB) {
        // Was in bullish mode
        ub = Math.min(upperBand, prevUB);
        lb = Math.max(lowerBand, prevLB);
    } else if (prevST < prevLB) {
        // Was in bearish mode
        ub = Math.min(upperBand, prevUB);
        lb = Math.max(lowerBand, prevLB);
    } else {
        ub = upperBand;
        lb = lowerBand;
    }

    if (price > ub) {
        st = ub;
    } else if (price < lb) {
        st = -lb;
    } else {
        st = prevST;
    }

    state[key] = { st, ub, lb };
    ctx.state  = state;
    return st;
}
