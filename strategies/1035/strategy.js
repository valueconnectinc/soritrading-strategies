/*
 * @coinsori-strategy v1
 * name: DXY-Regime EMA Fast
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Trend-following on daily BTC filtered by US Dollar Index (DXY) regime.
 * Uses faster EMA(5,13) instead of (9,21) — the previous window showed zero
 * crosses in 200-bar windows, so this catches signals more frequently.
 * DXY 5-day decline confirms capital rotation into risk assets.
 * Exits on death cross, ATR trail stop, or trend break.
 * Fails when BTC decouples from the dollar (e.g. ETF inflows, macro shocks).
 */

function onUpdate(ctx) {
    const s = ctx.state;

    // ── Indicators ──────────────────────────────────────────────
    const ema5  = ctx.ema(5);
    const ema13 = ctx.ema(13);
    const ema50 = ctx.ema(50);
    const atr   = ctx.atr(14);
    const dxy   = ctx.macro('dxy');

    // Warmup: need 50 bars for ema50
    if (ema5 == null || ema13 == null || ema50 == null || atr == null) return null;

    // ── State init ─────────────────────────────────────────────
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

    // ── Bar-change guard (prev values only update once per bar) ──
    if (s.lastBarI !== ctx.i) {
        s.prevEma5  = s.ema5;
        s.prevEma13 = s.ema13;
        s.lastBarI  = ctx.i;

        // DXY: rolling 5-bar window for 5-day change
        if (dxy != null && typeof dxy === 'number') {
            s.dxyHist.push(dxy);
            if (s.dxyHist.length > 5) s.dxyHist.shift();
            if (s.dxyHist.length >= 5) s.dxyWarm = true;
        }
    }
    s.ema5  = ema5;
    s.ema13 = ema13;

    // ── DXY regime: dollar must be declining over past 5 days ──
    // Fallback to true if DXY unavailable (do not block on missing macro data)
    let dxyOk = true;
    if (s.dxyWarm && s.dxyHist.length >= 5) {
        const dxyNow  = s.dxyHist[s.dxyHist.length - 1];
        const dxyPrev = s.dxyHist[0];
        dxyOk = (typeof dxyNow === 'number' && typeof dxyPrev === 'number')
            ? dxyNow < dxyPrev
            : true;
    }

    // ── Entry: EMA(5,13) golden cross above EMA50 + DXY confirm ──
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
    // ── Exit: death cross, trend break, or ATR stop ─────────────
    else {
        const crossDown = (s.prevEma5 != null && s.prevEma13 != null)
            && (s.prevEma5 >= s.prevEma13)
            && (s.ema5 < s.ema13);
        const stopPx      = (s.entryPx || ctx.price) - 2.5 * atr;
        const trendBroken = ctx.price < ema50;
        const holdMin     = (ctx.i - s.entryBar) >= 2;

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
        if (ctx.price <= stopPx) {
            ctx.log('STOP pnl='
                + (((ctx.price - s.entryPx) / s.entryPx) * 100).toFixed(1) + '%');
            s.entryPx = null; return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
