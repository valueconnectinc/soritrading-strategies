/*
 * @coinsori-strategy v1
 * name: DXY-Regime EMA Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Trend-following on daily BTC filtered by US Dollar Index (DXY) regime.
 * BTC and the dollar are historically inversely correlated — when DXY falls,
 * capital rotates into risk assets like BTC. This strategy only enters long
 * when the EMA(5,13) golden cross fires AND DXY has been declining over the
 * past 5 days (dollar weakening). Falls back to trend-only if DXY data
 * unavailable. Exits on death cross, EMA50 break, or 2.5× ATR stop.
 * Fails when BTC rallies despite a strong dollar (decoupled regimes).
 */

function onUpdate(ctx) {
    const s = ctx.state;

    const ema5  = ctx.ema(5);
    const ema13 = ctx.ema(13);
    const ema50 = ctx.ema(50);
    const atr   = ctx.atr(14);
    const dxy   = ctx.macro('dxy');

    // Warmup: need 50 bars for ema50
    if (ema5 == null || ema13 == null || ema50 == null || atr == null) return null;

    if (s.lastBarI === undefined) {
        s.lastBarI   = -1;
        s.prevEma5   = null;
        s.prevEma13  = null;
        s.ema5       = null;
        s.ema13      = null;
        s.entryPx    = null;
        s.entryBar   = -1;
        s.dxyHist    = [];
        s.dxyWarm    = false;
    }

    if (s.lastBarI !== ctx.i) {
        s.prevEma5  = s.ema5;
        s.prevEma13 = s.ema13;
        s.lastBarI  = ctx.i;

        if (dxy != null && typeof dxy === 'number') {
            s.dxyHist.push(dxy);
            if (s.dxyHist.length > 5) s.dxyHist.shift();
            if (s.dxyHist.length >= 5) s.dxyWarm = true;
        }
    }
    s.ema5  = ema5;
    s.ema13 = ema13;

    // DXY regime: dollar must be declining over past 5 days
    let dxyOk = true;
    if (s.dxyWarm && s.dxyHist.length >= 5) {
        const dxyNow  = s.dxyHist[s.dxyHist.length - 1];
        const dxyPrev = s.dxyHist[0];
        dxyOk = (typeof dxyNow === 'number' && typeof dxyPrev === 'number')
            ? dxyNow < dxyPrev
            : true;
    }

    // ── Entry ──────────────────────────────────────────────────
    if (!ctx.position) {
        const crossUp = (s.prevEma5 != null && s.prevEma13 != null)
            && (s.prevEma5 <= s.prevEma13)
            && (s.ema5 > s.ema13);
        const trendUp = ctx.price > ema50;

        if (crossUp && trendUp && dxyOk) {
            s.entryPx  = ctx.price;
            s.entryBar = ctx.i;
            const dxyStr = (dxy != null && typeof dxy === 'number') ? dxy.toFixed(2) : 'n/a';
            ctx.log('BUY i=' + ctx.i + ' price=' + ctx.price.toFixed(2)
                + ' dxy=' + dxyStr + ' dxyOk=' + dxyOk);
            return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.98 };
        }
    }
    // ── Exit ───────────────────────────────────────────────────
    else {
        const crossDown   = (s.prevEma5 != null && s.prevEma13 != null)
            && (s.prevEma5 >= s.prevEma13)
            && (s.ema5 < s.ema13);
        const trendBroken = ctx.price < ema50;
        const holdMin     = (ctx.i - s.entryBar) >= 2;
        const stopPx      = (s.entryPx || ctx.price) - 2.5 * atr;

        if (ctx.price <= stopPx) {
            ctx.log('STOP pnl='
                + (((ctx.price - s.entryPx) / s.entryPx) * 100).toFixed(1) + '%');
            s.entryPx = null; return { side: 'sell', qty: ctx.position };
        }
        if (crossDown && holdMin) {
            ctx.log('SELL crossDown pnl='
                + (((ctx.price - s.entryPx) / s.entryPx) * 100).toFixed(1) + '%');
            s.entryPx = null; return { side: 'sell', qty: ctx.position };
        }
        if (trendBroken && holdMin) {
            ctx.log('SELL trendBroken pnl='
                + (((ctx.price - s.entryPx) / s.entryPx) * 100).toFixed(1) + '%');
            s.entryPx = null; return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
