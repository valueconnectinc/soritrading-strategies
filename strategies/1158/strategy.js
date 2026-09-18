/*
 * @coinsori-strategy v1
 * name: Dual Oscillator v2 — Volume + ATR Trailing Stop
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Cycle 9 dual oscillator (RSI+Stoch+EMA200) returned +32.15% avg
 * with 3.74% MDD — strong base. v2 adds volume confirmation to filter low-volume
 * false reversals, tighter exits to capture mean-reversion faster, and an ATR trailing
 * stop to lock in gains without capping upside.
 * When it buys and sells: Buys when RSI < 35 AND Stochastic %K < 25 AND price above EMA200
 * AND volume > 20-bar average. Sells on RSI > 55, Stoch > 60, EMA200 break, or ATR trailing stop.
 * When it does NOT work: Still misses single-oscillator setups. Trailing stop may exit early
 * in slow sustained rallies before mean reversion completes.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────────
    const ema200  = ctx.ema(200);
    const rsi     = ctx.rsi(14);
    const sto     = ctx.stoch(14, 3);
    const atr     = ctx.atr(14);
    const avgVol  = ctx.avgVol(20);
    if (ema200 == null || rsi == null || sto == null || sto.k == null || atr == null || avgVol == null) return null;

    const price      = ctx.price;
    const aboveEMA   = price > ema200;
    const volConfirm = ctx.vol > avgVol;   // require above-average volume on entry

    // ── Entry: dual oversold + trend + volume ────────────────────────────────
    // RSI < 35 AND Stochastic %K < 25 = both deeply oversold simultaneously
    // Price above EMA200 = confirmed uptrend
    // Volume above average = reversal has real market participation
    if (ctx.position === 0 && rsi < 35 && sto.k < 25 && aboveEMA && volConfirm) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // ── Exit conditions ──────────────────────────────────────────────────────
    if (ctx.position > 0) {
        // Tighter exit: RSI 55 (was 60), Stoch 60 (was 65) — capture mean-reversion faster
        if (rsi > 55) return { side: 'sell', qty: ctx.position };
        if (sto.k > 60) return { side: 'sell', qty: ctx.position };

        // Trend break
        if (!aboveEMA) return { side: 'sell', qty: ctx.position };

        // ATR trailing stop: once unrealized PnL exceeds 1×ATR, trail at entry + 0.5×ATR
        // Uses ctx.entryPx (actual fill price) and ctx.uPnl (unrealized PnL in cash)
        const entryPx = ctx.entryPx;
        if (ctx.uPnl > atr * ctx.position) {
            const trailLevel = entryPx + atr * 0.5;
            if (price < trailLevel) return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
