/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Bollinger Band mean reversion — price touching the lower band is oversold,
 * price touching the upper band is overbought. Simple and frequent.
 * Why this: RSI(2) worked (best in this job) but the EMA200 trend filter may
 * be too restrictive. BB bands are dynamic and adapt to volatility, so they
 * naturally catch oversold/overbought without a separate trend filter.
 * When it buys: price crosses below lower BB (RSI < ~20 equivalent).
 * When it sells: price crosses above middle BB (mean reversion complete) OR
 * 1.5× ATR hard stop (loss cap). No profit target — let winners run.
 * When it does NOT work: in strong one-way trends where price stays glued
 * to the lower band for weeks (bear markets) — the stop gets hit repeatedly.
 */

function onUpdate(ctx) {
    const state  = ctx.state ?? {};
    const curBar = ctx.i;
    if (state.lastBarI !== curBar) {
        state.prevBB = state.snapBB ?? null;
        state.snapBB = ctx.bb(20, 2);
        state.lastBarI = curBar;
        ctx.state = state;
    }

    const bb  = ctx.bb(20, 2);
    const atr = ctx.atr(14);
    if (bb == null || atr == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;
    const entry = ctx.entryPx;

    const prevBB = state.prevBB;
    if (prevBB == null) return null;

    // ── Entry: price crosses below lower BB = oversold ─────────────────────
    const prevBelowLower = price < prevBB.lower;
    const nowBelowLower  = price < bb.lower;
    const crossBelowLower = !prevBelowLower && nowBelowLower;

    if (crossBelowLower && pos === 0) {
        const riskAmt = ctx.cash * 0.02;   // risk 2% per trade
        const qty     = riskAmt / atr;
        ctx.log(`BUY  BB_Oversold  qty=${qty.toFixed(4)}  price=${price}  lower=${bb.lower.toFixed(1)}`);
        return { side: 'buy', qty: qty };
    }

    // ── Exit: price crosses above middle BB = mean reversion complete ────
    if (pos > 0) {
        const prevBelowMid = price < prevBB.mid;
        const nowAboveMid  = price >= bb.mid;
        const crossAboveMid = !prevBelowMid && nowAboveMid;

        // 1.5× ATR hard stop
        const hardStop = entry > 0 && (entry - price) > atr * 1.5;

        // Trailing stop: once 2× ATR in profit, trail at entry
        const profit    = price - entry;
        const trailHit  = profit >= atr * 2;
        const trailStop = trailHit && (entry - price) > atr * 0.5;

        if (crossAboveMid || hardStop || trailStop) {
            const reason = crossAboveMid ? 'bb-mid-exit' : (trailStop ? 'trail-stop' : 'atr-stop');
            const pnl    = ((price - entry) / entry * 100).toFixed(2);
            ctx.log(`SELL ${reason}  qty=${pos}  price=${price}  pnl=${pnl}%`);
            return { side: 'sell', qty: pos };
        }
    }

    return null;
}
