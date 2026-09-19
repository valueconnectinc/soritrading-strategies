/*
 * @coinsori-strategy v1
 * name: EMA20 Trend + RSI40 Pullback v2
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Builds on the proven EMA20+RSI40 foundation (Exp 382:
 * beat benchmarks on all 3 walk-forward windows, 8-14 trades). This version
 * uses a RSI crossing below 40 signal (instead of just RSI<40) for cleaner
 * entry timing, and EMA20 rising momentum (2-bar confirmation) to reduce
 * false trend signals.
 * When it buys and sells: BUY when RSI crosses below 40 (fresh oversold
 * signal) while EMA20 is rising for 2+ bars (confirmed uptrend). SELL when
 * RSI>65 (overbought) OR price closes below EMA20 (trend broken).
 * When it does NOT work: in strong bear trends where EMA20 keeps falling —
 * no trades taken. Also fails in low-volatility sideways where RSI oscillates
 * around 40 without clear pullbacks.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────
    const rsi_1  = ctx.rsi(14, 1);    // confirmed RSI
    const rsi_2  = ctx.rsi(14, 2);    // previous RSI
    const ema20_1 = ctx.ema(20, 1);
    const ema20_2 = ctx.ema(20, 2);
    const ema20_3 = ctx.ema(20, 3);
    const close1 = ctx.closes[1];     // confirmed close

    if (rsi_1 == null || rsi_2 == null || ema20_1 == null || ema20_2 == null || ema20_3 == null || close1 == null) {
        return null;
    }

    // ── Trend guard ─────────────────────────────────────────────────────
    // EMA20 rising = confirmed short-term uptrend. The non-negotiable filter
    // that prevents the catastrophic whipsaws seen in RSI-only strategies
    // (Exp 381: 172-256 trades, MDD 46-62%).
    // Require rising for 2 consecutive bars to confirm momentum.
    const emaRising = ema20_1 > ema20_2 && ema20_2 >= ema20_3;

    // ── Entry signal ────────────────────────────────────────────────────
    // RSI crosses below 40: fresh oversold signal on confirmed bar.
    // Cross signal is cleaner than a static threshold — avoids repeatedly
    // buying when RSI sits at 39 for multiple bars.
    const rsiCrossDown40 = rsi_2 >= 40 && rsi_1 < 40;

    // ── Exit signals ─────────────────────────────────────────────────────
    const rsiOverbought = rsi_1 > 65;
    const priceBelowEMA = close1 < ema20_1;

    // ── BUY ─────────────────────────────────────────────────────────────
    if (ctx.position === 0 && rsiCrossDown40 && emaRising) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── SELL ────────────────────────────────────────────────────────────
    if (ctx.position > 0 && (rsiOverbought || priceBelowEMA)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
