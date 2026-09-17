/*
 * @coinsori-strategy v1
 * name: EMA Trend-Following Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Trend-following on daily BTC. Buys when fast EMA crosses above slow EMA
 * with rising volume confirming the move; sells on the reverse cross or
 * if price retraces 1.5×ATR from the EMA cross entry (tighter stop than v1).
 * Also requires RSI < 65 at entry to avoid chasing overbought moves.
 * Fails in markets that chop sideways without a clear trend.
 */

function onUpdate(ctx) {
    const s = ctx.state;

    // ── Indicators ──────────────────────────────────────────────
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const ema50 = ctx.ema(50);
    const atr   = ctx.atr(14);
    const rsi   = ctx.rsi(14);
    const vol   = ctx.vol;
    const avgVol = ctx.avgVol(20);

    if (ema9 == null || ema21 == null || ema50 == null || atr == null || rsi == null) return null;

    // ── State init ─────────────────────────────────────────────
    if (s.lastBarI === undefined) {
        s.lastBarI  = -1;
        s.prevEma9  = null;
        s.prevEma21 = null;
        s.entryPx   = null;
        s.entryBar  = -1;
        s.inTrade   = false;
    }

    // ── Bar-change guard: update previous EMA values once per bar ──
    if (s.lastBarI !== ctx.i) {
        s.prevEma9  = s.ema9;
        s.prevEma21 = s.ema21;
        s.lastBarI  = ctx.i;
    }
    s.ema9  = ema9;
    s.ema21 = ema21;

    // ── Volume filter: require above-average volume on signal ──────
    // Confirms the trend move is real, not just a thin-market spike
    const volOk = avgVol > 0 && vol > avgVol * 0.8;

    // ── Entry: EMA golden cross + price above EMA50 + volume + RSI ──
    if (!ctx.position) {
        // Golden cross: fast EMA crosses above slow EMA
        const crossUp = (s.prevEma9 != null && s.prevEma21 != null)
            && (s.prevEma9 <= s.prevEma21) && (s.ema9 > s.ema21);
        // Trend alignment: price above EMA50 (confirmed uptrend)
        const trendUp = ctx.price > ema50;
        // Volume confirmation
        const volConfirm = volOk;
        // RSI guard: not overbought — avoid chasing extended moves
        const rsiOk = rsi < 65;

        if (crossUp && trendUp && volConfirm && rsiOk) {
            s.entryPx  = ctx.price;
            s.entryBar = ctx.i;
            ctx.log('BUY i=' + ctx.i + ' price=' + ctx.price.toFixed(2) +
                    ' ema9=' + s.ema9.toFixed(2) + ' ema21=' + s.ema21.toFixed(2) +
                    ' rsi=' + rsi.toFixed(1) +
                    ' vol=' + vol.toFixed(0) + ' avgVol=' + avgVol.toFixed(0));
            return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.98 };
        }
    }
    // ── Exit: death cross, or ATR trailing stop, or EMA50 break ─────
    else {
        // Death cross: fast EMA crosses below slow EMA
        const crossDown = (s.prevEma9 != null && s.prevEma21 != null)
            && (s.prevEma9 >= s.prevEma21) && (s.ema9 < s.ema21);
        // ATR trailing stop: exit if price drops 1.5×ATR from entry (tightened from 2.5×)
        const stopPx = (s.entryPx || ctx.price) - 1.5 * atr;
        // EMA50 break: price falls below EMA50 (trend reversal signal)
        const trendBroken = ctx.price < ema50;
        // Minimum hold: at least 3 bars to avoid premature exit
        const holdMin = (ctx.i - s.entryBar) >= 3;

        if (crossDown && holdMin) {
            ctx.log('SELL i=' + ctx.i + ' crossDown price=' + ctx.price.toFixed(2) +
                    ' pnl=' + (((ctx.price - s.entryPx) / s.entryPx) * 100).toFixed(1) + '%');
            s.entryPx = null;
            return { side: 'sell', qty: ctx.position };
        }

        if (trendBroken && holdMin) {
            ctx.log('SELL i=' + ctx.i + ' trendBroken price=' + ctx.price.toFixed(2) +
                    ' ema50=' + ema50.toFixed(2) +
                    ' pnl=' + (((ctx.price - s.entryPx) / s.entryPx) * 100).toFixed(1) + '%');
            s.entryPx = null;
            return { side: 'sell', qty: ctx.position };
        }

        if (ctx.price <= stopPx) {
            ctx.log('STOP i=' + ctx.i + ' price=' + ctx.price.toFixed(2) +
                    ' stop=' + stopPx.toFixed(2) +
                    ' pnl=' + (((ctx.price - s.entryPx) / s.entryPx) * 100).toFixed(1) + '%');
            s.entryPx = null;
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
