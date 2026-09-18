/*
 * @coinsori-strategy v1
 * name: RSI Momentum + ATR Stop v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * RSI mean-reversion with FAST trend filter and tight ATR stop.
 * Fixes the v1 problem (EMA200 too slow) by using EMA50 and 1× ATR stop.
 * Why this: BTC crashes fast — EMA200 lags by days, letting losses run.
 * EMA50 reacts in hours, giving faster crash protection.
 * When it buys: RSI crosses above 35 (oversold bounce) while price is above
 * EMA50 (short-term uptrend) AND volume is elevated (1.2× 20-bar avg).
 * When it sells: RSI crosses below 65 in downtrend — OR 1× ATR hard stop —
 * OR RSI ≥ 80 (overbought lock) — OR 60-bar timeout (10 days max).
 * When it does NOT work: strong trending markets where RSI stays extended
 * and the fast EMA50 flip-flops, creating whipsaws. Also in low-vol chop
 * where RSI oscillates around thresholds without clear direction.
 */

function onUpdate(ctx) {
    // ── Core indicators ─────────────────────────────────────────────────────────
    const ema50  = ctx.ema(50);           // faster trend vs EMA200
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);
    const avgVol = ctx.avgVol(20);        // 20-bar average volume
    const fgRaw  = ctx.data('fear_greed'); // optional

    if (ema50 == null || rsi == null || atr == null || avgVol == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;
    const entry = ctx.entryPx;

    // ── Fear & Greed fallback ────────────────────────────────────────────────────
    const fg     = fgRaw ?? 50;
    const inPanic = fg < 20;

    // ── RSI crossover detection (ago=1 and ago=2 are safe closed bars) ───────────
    const rsi1 = ctx.rsi(14, 1);
    const rsi2 = ctx.rsi(14, 2);
    if (rsi1 == null || rsi2 == null) return null;

    const rsiCrossUp35 = rsi2 <= 35 && rsi1 > 35;  // oversold bounce
    const rsiCrossDn65 = rsi2 >= 65 && rsi1 < 65;  // overbought exhaustion

    // ── Volume confirmation ──────────────────────────────────────────────────────
    // Buy only when volume is elevated — confirms the bounce is real
    const volConfirm = ctx.vol > avgVol * 1.2;

    // ── Trend (fast EMA50) ────────────────────────────────────────────────────────
    const bullShort = price > ema50;
    const bearShort  = price < ema50;

    // ── Entry ───────────────────────────────────────────────────────────────────
    const meanRevBuy = rsiCrossUp35 && bullShort && volConfirm;
    const panicBuy   = inPanic && bullShort && volConfirm && pos === 0;

    if ((meanRevBuy || panicBuy) && pos === 0) {
        const riskAmt = ctx.cash * 0.02;  // risk 2% per trade
        const qty     = riskAmt / atr;    // ATR-based position sizing
        const mode    = panicBuy ? 'PANIC' : 'RSI_BOUNCE';
        ctx.log(`BUY  ${mode}  qty=${qty.toFixed(4)}  price=${price}  RSI=${rsi.toFixed(1)}  volRatio=${(ctx.vol/avgVol).toFixed(2)}`);
        return { side: 'buy', qty: qty };
    }

    // ── Sell ─────────────────────────────────────────────────────────────────────
    // Trend exhaustion: RSI overbought cross + price below EMA50
    const trendExit = rsiCrossDn65 && bearShort;

    // TIGHT ATR stop: 1× ATR loss from entry (v1 used 1.5× — too loose)
    const hardStop = entry > 0 && (entry - price) > atr * 1.0;

    // Very overbought: lock profits at RSI 80+
    const veryOverbought = rsi >= 80;

    if ((trendExit || hardStop || veryOverbought) && pos > 0) {
        const reason = hardStop ? 'atr-stop' : (veryOverbought ? 'overbought' : 'trend-exit');
        ctx.log(`SELL ${reason}  qty=${pos}  price=${price}  RSI=${rsi.toFixed(1)}  held=${ctx.i - (ctx.symState?.entryBar ?? ctx.i)}`);
        return { side: 'sell', qty: pos };
    }

    // ── Timeout: max 60 bars (≈10 days) ─────────────────────────────────────────
    const state    = ctx.symState;
    const entryBar = state?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 60) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}
