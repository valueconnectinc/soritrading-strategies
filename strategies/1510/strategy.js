/*
 * @coinsori-strategy v1
 * name: EMA50 RSI Pullback
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA50 is the middle ground between EMA20 (too fast, exp 358
 * only caught 4 trades) and EMA200 (too slow, exp 295). It captures medium-term
 * SOL trends without the whipsaw of EMA20 or the lag of EMA200. The RSI 40-60
 * zone is the "healthy pullback" range — price has dipped but the trend is intact.
 * When it buys and sells: Buy when price > EMA50 (confirmed uptrend) and RSI(14)
 * pulls back into 40-60 zone. Sell when RSI hits 65 (not overbought 70 — exit
 * earlier to lock gains) or price drops below EMA50.
 * When it does NOT work: In sharp V-shaped recoveries where RSI never lingers in
 * 40-60 (jumps from <30 to >60 immediately). Also loses to buy-hold in sustained
 * SOL pumps where the pullback never comes.
 */
function onUpdate(ctx) {
    const ema50  = ctx.ema(50);
    const rsi    = ctx.rsi(14);
    const price  = ctx.price;
    const pos    = ctx.position;

    // Warm-up guard
    if (ema50 == null || rsi == null) return null;

    // ── EXIT LOGIC ─────────────────────────────────────────────
    if (pos > 0) {
        // Exit 1: overbought — RSI hits 65 (exit earlier than 70 to lock gains)
        if (rsi > 65) {
            ctx.log('RSI=' + rsi.toFixed(1) + ' > 65, exit');
            return { side: 'sell', qty: pos };
        }
        // Exit 2: trend broken — price drops below EMA50
        if (price < ema50) {
            ctx.log('Price below EMA50, exit');
            return { side: 'sell', qty: pos };
        }
    }

    // ── ENTRY LOGIC ─────────────────────────────────────────────
    if (pos === 0) {
        // Price must be above EMA50 — confirms we're in a medium-term uptrend
        if (price <= ema50) return null;

        // RSI pullback zone: 40-60.
        // Below 40 = oversold (too risky entry),
        // above 60 = not enough pullback (bad risk/reward).
        if (rsi >= 40 && rsi <= 60) {
            ctx.log('BUY EMA50=' + ema50.toFixed(2) + ' RSI=' + rsi.toFixed(1));
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    return null;
}
