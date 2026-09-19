/*
 * @coinsori-strategy v1
 * name: Stochastic RSI Momentum
 * ex: binance
 * syms: SUIUSDT
 * interval: 4h
 * cash: 10000
 *
 * Stochastic RSI momentum on SUIUSDT 4H. Buy when StochRSI crosses above 20
 * (oversold bounce) with price above EMA20 and above-average volume.
 * Sell when StochRSI crosses below 80 (overbought) or RSI drops below 50.
 * When it fails: in strong trends StochRSI stays overbought/oversold for
 * long periods, causing premature exits and missed moves.
 */
function onUpdate(ctx) {
    // ── Warm-up ──────────────────────────────────────────────────────────────
    const stoch = ctx.stoch(14, 3);
    const rsi   = ctx.rsi(14);
    const ema20 = ctx.ema(20);
    const vol   = ctx.vol;
    const avgVol = ctx.avgVol(20);
    const price = ctx.price;

    if (stoch == null || rsi == null || ema20 == null || avgVol == null) return null;

    // ── Previous bar StochRSI (to detect crossover) ──────────────────────────
    const stoch1 = ctx.stoch(14, 3, 1);
    if (stoch1 == null) return null;

    // ── Volume confirmation ──────────────────────────────────────────────────
    const volConfirm = vol > avgVol * 1.1;

    // ── Price above EMA20 (trend confirmation) ───────────────────────────────
    const priceAboveEma = price > ema20;

    // ── ENTRY: StochRSI crosses above 20 (was ≤20, now >20) ──────────────────
    if (stoch1.k <= 20 && stoch.k > 20 && priceAboveEma && volConfirm) {
        if (ctx.position === 0) {
            return { side: 'buy', qty: ctx.cash / price * 0.99 };
        }
    }

    // ── EXIT ─────────────────────────────────────────────────────────────────
    if (ctx.position > 0) {
        // Exit 1: StochRSI crosses below 80 (overbought exit)
        if (stoch1.k >= 80 && stoch.k < 80) {
            return { side: 'sell', qty: ctx.position };
        }
        // Exit 2: RSI drops below 50 (momentum weakening)
        if (rsi < 50) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
