/*
 * @coinsori-strategy v1
 * name: Fear & Greed Regime Filter + RSI Mean Reversion v2
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Uses the Fear & Greed Index as a macro sentiment filter, combined with
 * RSI(14) mean-reversion signals and EMA-200 trend confirmation. v2 lowers
 * RSI thresholds (40/60 vs original 35/65) and adds a panic-buy mode:
 * when Fear & Greed drops below 20 (extreme fear/capitulation), the strategy
 * buys even if RSI is elevated — capturing sharp reversal snaps.
 * When it buys: (A) RSI crosses above 40 while FG < 30 and price > EMA-200,
 * OR (B) FG < 20 regardless of RSI (panic capitulation buy).
 * When it sells: RSI crosses above 60 while FG > 70 — OR 2×ATR hard stop.
 * When it does NOT work: strong one-directional trending markets where
 * RSI stays elevated and FG never drops below 20 — the strategy can sit out
 * long periods while missing large moves.
 */

function onUpdate(ctx) {
    // ── Warm-up guards ──────────────────────────────────────────────────────────
    const ema200 = ctx.ema(200);
    const rsi    = ctx.rsi(14);
    const atr    = ctx.atr(14);
    const fgRaw  = ctx.data('fear_greed');

    if (ema200 == null || rsi == null || atr == null || fgRaw == null) return null;

    const price = ctx.price;
    const pos   = ctx.position;
    const entry = ctx.entryPx;

    // ── Regime thresholds ───────────────────────────────────────────────────────
    const FEAR_THRESH   = 30;
    const GREED_THRESH  = 70;
    const PANIC_THRESH  = 20;   // capitulation floor — buy even without RSI signal
    const inFear  = fgRaw < FEAR_THRESH;
    const inPanic = fgRaw < PANIC_THRESH;
    const inGreed = fgRaw > GREED_THRESH;

    // ── RSI crossover detection (safe: ago=1 and ago=2 are closed bars) ─────────
    const rsi1 = ctx.rsi(14, 1);
    const rsi2 = ctx.rsi(14, 2);
    if (rsi1 == null || rsi2 == null) return null;

    // Mode A: classic mean-reversion — RSI crosses above 40 from below
    const rsiCrossUp40 = rsi2 <= 40 && rsi1 > 40 && rsi > 40;
    const meanRevBuy = rsiCrossUp40 && inFear && price > ema200;

    // Mode B: panic capitulation — FG below 20, price above EMA-200, no open position
    const panicBuy = inPanic && price > ema200 && pos === 0;

    if ((meanRevBuy || panicBuy) && pos === 0) {
        const riskAmt = ctx.cash * 0.02;           // risk 2% of cash per trade
        const qty     = riskAmt / atr;             // ATR-based sizing
        const mode    = panicBuy ? 'PANIC' : 'MEANREV';
        ctx.log(`BUY  mode=${mode}  qty=${qty.toFixed(4)}  price=${price}  RSI=${rsi.toFixed(1)}  FG=${fgRaw}`);
        return { side: 'buy', qty: qty };
    }

    // ── Sell: RSI crossed above 60 in greed zone OR 2×ATR hard stop ────────────
    const rsiCrossDn60 = rsi2 >= 60 && rsi1 < 60 && rsi < 60;
    const sellSignal = rsiCrossDn60 && inGreed;
    const hardStop   = entry > 0 && (entry - price) > atr * 2;   // 2×ATR loss

    if ((sellSignal || hardStop) && pos > 0) {
        const reason = hardStop ? 'hard-stop' : 'greed-sell';
        ctx.log(`SELL reason=${reason}  qty=${pos}  price=${price}  RSI=${rsi.toFixed(1)}  FG=${fgRaw}`);
        return { side: 'sell', qty: pos };
    }

    // ── Timeout exit: max hold 7 days (168 × 4h bars) ──────────────────────────
    const state    = ctx.symState;
    const entryBar = state?.entryBar ?? -1;
    if (pos > 0 && entryBar >= 0 && (ctx.i - entryBar) > 168) {
        ctx.log(`SELL timeout  barsHeld=${ctx.i - entryBar}`);
        return { side: 'sell', qty: pos };
    }

    return null;
}
