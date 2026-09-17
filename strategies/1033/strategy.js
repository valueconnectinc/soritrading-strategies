/*
 * @coinsori-strategy v1
 * name: BB Mean Reversion Daily
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Mean reversion on daily BTCUSDT. Buys when price bounces off the lower
 * Bollinger Band in oversold territory; sells at the middle band or on
 * RSI overbought. Filters out low-volume days to avoid false bounces.
 * Works best in ranging markets; loses in sustained one-directional moves.
 */

function onUpdate(ctx) {
    const s = ctx.state;

    // ── Indicators ──────────────────────────────────────────────
    const bb    = ctx.bb(20, 2);       // { upper, mid, lower }
    const rsi   = ctx.rsi(14);
    const atr   = ctx.atr(14);
    const vol   = ctx.vol;
    const avgVol = ctx.avgVol(20);

    if (!bb || rsi == null || atr == null) return null; // warmup

    // ── State init ─────────────────────────────────────────────
    if (s.entryPx === undefined) {
        s.entryPx    = null;
        s.entryBar    = -1;
        s.prevRsi     = null;
        s.tradeCount  = 0;
    }

    // ── Volume filter: skip signals on below-average volume ─────
    // Avoids whipsaws in thin markets where BB touches are noise
    const volOk = avgVol > 0 && vol > avgVol * 0.5;

    // ── Entry: price at/below lower band + RSI oversold + vol ───
    if (!ctx.position) {
        const priceAtLower = ctx.price <= bb.lower * 1.005; // 0.5% buffer
        const rsiOversold  = rsi < 35;
        const prevRsi     = s.prevRsi;
        const rsiTurningUp = prevRsi != null && prevRsi < rsi; // RSI recovering

        if (priceAtLower && rsiOversold && volOk) {
            s.entryPx  = ctx.price;
            s.entryBar = ctx.i;
            s.tradeCount++;
            ctx.log('BUY i=' + ctx.i + ' price=' + ctx.price.toFixed(2) +
                    ' lower=' + bb.lower.toFixed(2) + ' rsi=' + rsi.toFixed(1) +
                    ' vol=' + vol.toFixed(0) + ' trade#' + s.tradeCount);
            return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.98 };
        }
    }
    // ── Exit: price at/above middle band, or RSI overbought, or ATR stop ─
    else {
        const priceAtMid  = ctx.price >= bb.mid * 0.998;
        const rsiOB       = rsi > 65;
        const holdMinBars = (ctx.i - s.entryBar) >= 2; // hold at least 2 bars
        const stopPx      = (s.entryPx || ctx.price) - 2.5 * atr;

        if ((priceAtMid || rsiOB) && holdMinBars) {
            ctx.log('SELL i=' + ctx.i + ' price=' + ctx.price.toFixed(2) +
                    ' mid=' + bb.mid.toFixed(2) + ' rsi=' + rsi.toFixed(1) +
                    ' pnl=' + ((ctx.price - s.entryPx) / s.entryPx * 100).toFixed(1) + '%');
            s.entryPx = null;
            return { side: 'sell', qty: ctx.position };
        }

        // Hard stop: 2.5×ATR loss from entry
        if (ctx.price <= stopPx) {
            ctx.log('STOP i=' + ctx.i + ' price=' + ctx.price.toFixed(2) +
                    ' stop=' + stopPx.toFixed(2) +
                    ' pnl=' + ((ctx.price - s.entryPx) / s.entryPx * 100).toFixed(1) + '%');
            s.entryPx = null;
            return { side: 'sell', qty: ctx.position };
        }
    }

    // Update RSI history for rsiTurningUp detection
    s.prevRsi = rsi;

    return null;
}
