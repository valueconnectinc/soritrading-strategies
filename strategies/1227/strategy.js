/*
 * @coinsori-strategy v1
 * name: Stochastic Momentum v5 (fixed)
 * ex: binance
 * syms: SOLUSDT, DOGEUSDT, BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Stochastic Oscillator (%K/%D crossover) captures momentum shifts
 * differently from RSI — it reacts to the actual price range within a window. Combined
 * with ATR-based stop-loss for risk control.
 * When it buys and sells: Buys when %K crosses above %D (momentum shifting positive).
 * Stops out at 2× ATR below entry. Sells when %K crosses below %D.
 * When it does NOT work: Choppy markets — multiple crossovers with no directional
 * follow-through cause whipsaws. In strong trends, exits too early at first overbought
 * cross rather than holding the full move.
 */
function onUpdate(ctx) {
    // IMPORTANT: call stoch() ONCE per bar — calling twice returns the same object
    // reference, making %K === %D always and crossover never fires.
    const curr = ctx.stoch(14, 3, 1);   // current bar {k, d}
    const prev = ctx.stoch(14, 3, 2);   // previous closed bar {k, d}
    const atr  = ctx.atr(14, 1);
    const price = ctx.price;

    if (curr == null || prev == null) return null;
    if (atr == null) return null;

    const k0 = curr.k, d0 = curr.d;
    const k1 = prev.k, d1 = prev.d;

    // %K crosses above %D → buy signal
    const cross_up = (k1 <= d1) && (k0 > d0);
    // %K crosses below %D → sell signal
    const cross_dn = (k1 >= d1) && (k0 < d0);

    if (cross_up && ctx.position === 0) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── ATR stop-loss ──
    if (ctx.position > 0 && ctx.entryPx != null) {
        if (price < ctx.entryPx - 2.0 * atr) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    // ── Momentum exit ──
    if (cross_dn && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
