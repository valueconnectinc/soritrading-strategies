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
 * when the EMA golden cross fires AND DXY has been declining over the past
 * 5 days (dollar weakening). Falls back to trend-only if DXY data unavailable.
 * Exits on death cross or ATR stop.
 * Fails when BTC rallies despite a strong dollar (decoupled regimes).
 */

function onUpdate(ctx) {
    const s = ctx.state;

    // ── Indicators ──────────────────────────────────────────────
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const ema50 = ctx.ema(50);
    const atr   = ctx.atr(14);
    const vol   = ctx.vol;
    const avgVol = ctx.avgVol(20);
    const dxy   = ctx.macro('dxy');

    if (ema9 == null || ema21 == null || ema50 == null || atr == null) return null;

    // ── State init ─────────────────────────────────────────────
    if (s.lastBarI === undefined) {
        s.lastBarI   = -1;
        s.prevEma9   = null;
        s.prevEma21  = null;
        s.entryPx    = null;
        s.entryBar   = -1;
        s.dxyHist    = [];   // rolling 5-bar DXY history
        s.dxyWarm    = false; // true once we have 5 DXY readings
    }

    // ── Bar-change guard ───────────────────────────────────────
    if (s.lastBarI !== ctx.i) {
        s.prevEma9  = s.ema9;
        s.prevEma21 = s.ema21;
        s.lastBarI  = ctx.i;

        // Track DXY: keep last 5 readings (5-day change)
        if (dxy != null) {
            s.dxyHist.push(dxy);
            if (s.dxyHist.length > 5) s.dxyHist.shift();
            if (s.dxyHist.length >= 5) s.dxyWarm = true;
        }
    }
    s.ema9  = ema9;
    s.ema21 = ema21;

    // ── DXY regime: dollar must be declining over the past 5 days ──
    // When DXY is falling, capital rotates into risk assets like BTC.
    // Fallback to true if DXY data not yet warm (avoids missing early entries)
    let dxyOk = true;  // default: allow if DXY unknown
    if (s.dxyWarm && s.dxyHist.length >= 5) {
        const dxyNow  = s.dxyHist[s.dxyHist.length - 1];
        const dxyPrev = s.dxyHist[0];  // 5 bars ago
        dxyOk = dxyNow < dxyPrev;     // dollar weakening
    }

    // ── Volume filter ──────────────────────────────────────────
    const volOk = avgVol > 0 && vol > avgVol * 0.8;

    // ── Entry ──────────────────────────────────────────────────
    if (!ctx.position) {
        const crossUp  = (s.prevEma9 != null && s.prevEma21 != null)
            && (s.prevEma9 <= s.prevEma21) && (s.ema9 > s.ema21);
        const trendUp   = ctx.price > ema50;
        const volConfirm = volOk;

        if (crossUp && trendUp && volConfirm && dxyOk) {
            s.entryPx  = ctx.price;
            s.entryBar = ctx.i;
            ctx.log('BUY i=' + ctx.i + ' price=' + ctx.price.toFixed(2) +
                    ' dxy=' + (dxy != null ? dxy.toFixed(2) : 'n/a') +
                    ' dxyOk=' + dxyOk);
            return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.98 };
        }
    }
    // ── Exit ───────────────────────────────────────────────────
    else {
        const crossDown   = (s.prevEma9 != null && s.prevEma21 != null)
            && (s.prevEma9 >= s.prevEma21) && (s.ema9 < s.ema21);
        const stopPx      = (s.entryPx || ctx.price) - 2.5 * atr;
        const trendBroken = ctx.price < ema50;
        const holdMin     = (ctx.i - s.entryBar) >= 3;

        if (crossDown && holdMin) {
            ctx.log('SELL crossDown pnl=' + (((ctx.price - s.entryPx) / s.entryPx) * 100).toFixed(1) + '%');
            s.entryPx = null; return { side: 'sell', qty: ctx.position };
        }
        if (trendBroken && holdMin) {
            ctx.log('SELL trendBroken pnl=' + (((ctx.price - s.entryPx) / s.entryPx) * 100).toFixed(1) + '%');
            s.entryPx = null; return { side: 'sell', qty: ctx.position };
        }
        if (ctx.price <= stopPx) {
            ctx.log('STOP pnl=' + (((ctx.price - s.entryPx) / s.entryPx) * 100).toFixed(1) + '%');
            s.entryPx = null; return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
