/*
 * @coinsori-strategy v1
 * name: BB RSI Mean Reversion Daily v5
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * BB+RSI mean reversion with EMA50 trend filter — same family as v4
 * but adds a trend guard to prevent buying in bear markets.
 * Fixes the catastrophic window-3 loss (-56%, 94 trades) in v4 where
 * the strategy kept buying BTC as it dropped 70% in 2022.
 * When it buys: price crosses above lower BB band, RSI(7) < 35,
 * volume confirms, AND price is ABOVE EMA50 (uptrend confirmed).
 * When it sells: price crosses below upper BB band OR RSI > 65 OR
 * price crosses below BB middle band.
 * When it does NOT work: in slow grinding bear markets where price
 * oscillates around EMA50 — the filter avoids some but not all traps.
 */

function onUpdate(ctx) {
    // ── Per-bar state ───────────────────────────────────────
    const state  = ctx.state ?? {};
    const curBar = ctx.i;
    if (state.lastBarI !== curBar) {
        state.prevRsi  = state.snapRsi  ?? null;
        state.snapRsi  = ctx.rsi(7);
        state.lastBarI = curBar;
        ctx.state      = state;
    }

    // ── Indicators ──────────────────────────────────────────
    const bb     = ctx.bb(20, 2);
    const rsi    = ctx.rsi(7);
    const vol    = ctx.vol;
    const avgVol = ctx.avgVol(20);
    const ema50  = ctx.ema(50);   // trend filter

    if (bb == null || rsi == null || avgVol == null || ema50 == null) return null;

    const { upper, mid, lower } = bb;
    const price    = ctx.price;
    const position = ctx.position;

    // ── Trend filter: only buy in uptrends ─────────────────
    const bullMarket = price > ema50;

    // ── Entry signals ───────────────────────────────────────
    const prevClose      = ctx.closes?.[1];
    const crossUpLower   = prevClose != null && prevClose <= lower && price > lower;
    const rsiOversold    = rsi < 35;
    const volumeConfirm  = vol > avgVol;

    if (crossUpLower && rsiOversold && volumeConfirm && bullMarket && position === 0) {
        ctx.log(`BUY  crossUpLower  price=${price}  RSI=${rsi.toFixed(1)}  vol=${vol.toFixed(0)}  EMA50=${ema50.toFixed(0)}`);
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Exit signals ────────────────────────────────────────
    if (position > 0) {
        const crossDownUpper = prevClose != null && prevClose >= upper && price < upper;
        const rsiPrev       = state.prevRsi;
        const rsiCrossDn     = rsiPrev != null && rsiPrev >= 65 && rsi < 65;
        const crossBelowMid = prevClose != null && prevClose >= mid && price < mid;

        if (crossDownUpper || rsiCrossDn || crossBelowMid) {
            const reason = crossDownUpper ? 'aboveUpperBand' : (rsiCrossDn ? 'rsiOverbought' : 'belowMidBand');
            ctx.log(`SELL ${reason}  price=${price}  RSI=${rsi.toFixed(1)}`);
            return { side: 'sell', qty: position };
        }
    }

    return null;
}
