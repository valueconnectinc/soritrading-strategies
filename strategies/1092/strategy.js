/*
 * @coinsori-strategy v1
 * name: OI Crash Detector + RSI Mean Reversion v3
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI mean-reversion with Binance OI crash detection.
 * Fixes the crash-protection problem (May 2021, Nov 2022) that EMA200
 * alone cannot catch — when OI drops sharply, it signals mass liquidations
 * and forces an immediate exit, regardless of trend filter.
 * Why this: OI collapse is a more reliable crash signal than price-based
 * indicators because it directly measures leverage being wiped out.
 * When it buys: RSI crosses above 30 while price is above EMA200
 * (uptrend confirmed) AND OI is stable/rising (no crash in progress).
 * When it sells: OI drops >15% over one bar (CRASH EXIT — immediate) OR
 * RSI crosses below 70 in downtrend OR ATR 1.5× stop OR 120-bar timeout.
 * When it does NOT work: in slow grinding downtrends where OI erodes
 * gradually (no sharp flush) — the crash exit won't trigger and the
 * ATR stop handles it. Also in choppy low-vol markets with frequent
 * small RSI bounces that don't develop into trades.
 */

function onUpdate(ctx) {
    // ── Bar-change detection (onUpdate fires every TICK, not just on new bars) ───
    const state = ctx.state ?? {};
    const curBar = ctx.i;
    if (state.lastBarI !== curBar) {
        // New bar: roll forward the previous-bar snapshot
        state.prevRsi   = state.snapRsi   ?? null;
        state.snapRsi   = ctx.rsi(14);     // current bar RSI snapshot
        state.prevOi    = state.snapOi    ?? null;
        state.snapOi    = ctx.binanceOi(); // current bar OI snapshot
        state.lastBarI  = curBar;
        ctx.state = state;
    }

    // ── Core indicators ─────────────────────────────────────────────────────────
    const ema200 = ctx.ema(200);
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);

    if (ema200 == null || rsi == null || atr == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;
    const entry = ctx.entryPx;

    // ── RSI crossover (using bar snapshots — prevRsi and snapRsi are adjacent bars) ─
    const rsiNow  = state.snapRsi;   // current bar RSI
    const rsiPrev = state.prevRsi;   // previous bar RSI
    if (rsiNow == null || rsiPrev == null) return null;

    const rsiCrossUp30 = rsiPrev <= 30 && rsiNow > 30;
    const rsiCrossDn70 = rsiPrev >= 70 && rsiNow < 70;

    // ── OI crash detection ─────────────────────────────────────────────────────
    // Compare OI from current and previous bar. A sharp drop = leverage flush.
    const oiNow  = state.snapOi;
    const oiPrev = state.prevOi;
    let oiCrash = false;
    if (oiNow != null && oiPrev != null && oiPrev > 0) {
        const oiChg = (oiNow - oiPrev) / oiPrev;
        // Crash: OI dropped >15% in one 4h bar
        oiCrash = oiChg < -0.15;
    }

    // ── Trend ───────────────────────────────────────────────────────────────────
    const bullTrend = price > ema200;
    const bearTrend  = price < ema200;

    // ── Entry (only when OI is NOT crashing) ───────────────────────────────────
    const meanRevBuy = rsiCrossUp30 && bullTrend && !oiCrash;

    if (meanRevBuy && pos === 0) {
        const riskAmt = ctx.cash * 0.02;
        const qty     = riskAmt / atr;
        ctx.log(`BUY  RSI_Bounce  qty=${qty.toFixed(4)}  price=${price}  RSI=${rsi.toFixed(1)}`);
        return { side: 'buy', qty: qty };
    }

    // ── Sell ─────────────────────────────────────────────────────────────────────
    // CRASH EXIT: OI dropped sharply — liquidations in progress, exit immediately
    // This is the key fix vs v1: OI catches crashes that EMA200 misses
    if (oiCrash && pos > 0) {
        const oiNow2  = state.snapOi;
        const oiPrev2 = state.prevOi;
        const oiChg   = (oiNow2 != null && oiPrev2 != null && oiPrev2 > 0)
            ? ((oiNow2 - oiPrev2) / oiPrev2 * 100).toFixed(1) + '%'
            : 'n/a';
        ctx.log(`SELL OI_CRASH  OI_chg=${oiChg}  price=${price}`);
        return { side: 'sell', qty: pos };
    }

    // Trend exhaustion: RSI overbought cross in downtrend
    const trendExit = rsiCrossDn70 && bearTrend;

    // ATR stop: 1.5× ATR loss from entry (proven robust in v1)
    const hardStop = entry > 0 && (entry - price) > atr * 1.5;

    // Very overbought: lock profits at RSI 80+
    const veryOverbought = rsi >= 80;

    if ((trendExit || hardStop || veryOverbought) && pos > 0) {
        const reason = hardStop ? 'atr-stop' : (veryOverbought ? 'overbought' : 'trend-exit');
        ctx.log(`SELL ${reason}  qty=${pos}  price=${price}  RSI=${rsi.toFixed(1)}`);
        return { side: 'sell', qty: pos };
    }

    // ── Timeout: max 120 bars (≈20 days) ────────────────────────────────────────
    const symState  = ctx.symState;
    const entryBar  = symState?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 120) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}
