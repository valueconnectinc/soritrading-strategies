/*
 * @coinsori-strategy v1
 * name: RSI Oversold + EMA Trend + BB Confirmation v3
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * A pure technical RSI mean-reversion strategy with trend confirmation.
 * Fear & Greed (ctx.data) is optional — if no dataset is registered, the
 * strategy runs on RSI + EMA + Bollinger Bands alone and still fires signals.
 * Why this: BTC oscillates between oversold bounces and overbought exhaustion
 * on the 4h chart, and combining RSI with trend + volatility filters avoids
 * catching knives in downtrends.
 * When it buys: RSI crosses above 30 (oversold bounce) while price is above
 * EMA-200 (uptrend confirmed) AND within 1.5σ of the 20-bar Bollinger Band
 * (not extended — avoids buying after a sharp spike).
 * When it sells: RSI crosses below 70 (overbought exhaustion) while price is
 * below EMA-200 — OR ATR-based stop (1.5× ATR loss) — OR 5-day timeout.
 * When it does NOT work: strong one-directional trends where RSI stays
 * elevated (bull traps) or depressed (dead cat bounces in bear markets) —
 * the trend filter keeps us out of counter-trend moves that fail.
 */

function onUpdate(ctx) {
    // ── Core indicators ─────────────────────────────────────────────────────────
    const ema200 = ctx.ema(200);
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);
    const bb     = ctx.bb(20, 2);          // { upper, mid, lower }
    const fgRaw  = ctx.data('fear_greed'); // optional — strategy works without it

    // Warm up on core indicators only (FG is a filter, not a prerequisite)
    if (ema200 == null || rsi == null || atr == null || bb == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;
    const entry = ctx.entryPx;

    // ── Optional Fear & Greed filter (graceful fallback) ───────────────────────
    const fg = fgRaw ?? 50;               // neutral 50 if no dataset registered
    const inFear  = fg < 30;
    const inGreed = fg > 70;
    const inPanic = fg < 20;              // capitulation — extra conviction buy

    // ── RSI crossover detection (safe: ago=1 and ago=2 are closed bars) ─────────
    const rsi1 = ctx.rsi(14, 1);
    const rsi2 = ctx.rsi(14, 2);
    if (rsi1 == null || rsi2 == null) return null;

    // RSI crossed above 30 from below or equal (oversold bounce)
    const rsiCrossUp30 = rsi2 <= 30 && rsi1 > 30;
    // RSI crossed below 70 from above or equal (overbought exhaustion)
    const rsiCrossDn70 = rsi2 >= 70 && rsi1 < 70;

    // ── Bollinger Band proximity filter ───────────────────────────────────────
    // Buy only when price is within 1.5σ of the lower band — not after a spike
    const bbRange = bb.upper - bb.lower;
    const priceDistFromLower = price - bb.lower;
    const bbProximity = bbRange > 0 ? priceDistFromLower / bbRange : 1;
    const nearLowerBand = bbProximity <= 1.5;  // within 1.5σ of lower band

    // ── Trend confirmation ──────────────────────────────────────────────────────
    const bullTrend = price > ema200;
    const bearTrend  = price < ema200;

    // ── Entry logic ─────────────────────────────────────────────────────────────
    // Mode A: classic mean-reversion — RSI bounce + trend + BB proximity
    const meanRevBuy = rsiCrossUp30 && bullTrend && nearLowerBand;

    // Mode B: panic capitulation — FG < 20, still in uptrend, not extended
    const panicBuy = inPanic && bullTrend && nearLowerBand && pos === 0;

    // Mode C: oversold in fear zone — RSI bounce + extreme fear, even if no BB fit
    const fearBuy = rsiCrossUp30 && inFear;

    if ((meanRevBuy || panicBuy || fearBuy) && pos === 0) {
        const riskAmt = ctx.cash * 0.02;   // risk 2% of cash per trade
        const qty     = riskAmt / atr;      // ATR-based sizing
        const mode    = panicBuy ? 'PANIC' : (meanRevBuy ? 'MEANREV' : 'FEAR');
        ctx.log(`BUY  mode=${mode}  qty=${qty.toFixed(4)}  price=${price}  RSI=${rsi.toFixed(1)}  FG=${fg}`);
        return { side: 'buy', qty: qty };
    }

    // ── Sell logic ───────────────────────────────────────────────────────────────
    // RSI crossed below 70 in bear trend — trend exhaustion exit
    const rsiCrossDn70 = rsi2 >= 70 && rsi1 < 70 && rsi < 70;
    const trendExit = rsiCrossDn70 && bearTrend;

    // ATR-based hard stop — 1.5× ATR loss from entry
    const hardStop = entry > 0 && (entry - price) > atr * 1.5;

    // Take profit — RSI reached 80+ (very overbought), lock gains
    const veryOverbought = rsi >= 80;

    if ((trendExit || hardStop || veryOverbought) && pos > 0) {
        const reason = hardStop ? 'hard-stop' : (veryOverbought ? 'overbought' : 'trend-exit');
        ctx.log(`SELL reason=${reason}  qty=${pos}  price=${price}  RSI=${rsi.toFixed(1)}  FG=${fg}`);
        return { side: 'sell', qty: pos };
    }

    // ── Timeout exit: max hold 120 × 4h bars (≈20 days) ─────────────────────────
    const state    = ctx.symState;
    const entryBar = state?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 120) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}
