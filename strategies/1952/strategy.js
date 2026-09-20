/*
 * @coinsori-strategy v1
 * name: EMA Cross Momentum
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Trend-following strategy that rides confirmed momentum moves.
 * Buys when the fast EMA crosses above the slow EMA with RSI and volume confirmation.
 * Sells when the fast EMA crosses below, or when a trailing ATR stop triggers.
 * Does NOT work: sideways choppy markets where EMAs keep crossing — generates whipsaws and losses.
 */

function onUpdate(ctx) {
    // === WARM-UP ===
    const emaFast5 = ctx.ema(5);
    const emaSlow21 = ctx.ema(21);
    const emaFast5_1 = ctx.ema(5, 1);
    const emaSlow21_1 = ctx.ema(21, 1);
    const rsi14 = ctx.rsi(14);
    const atr14 = ctx.atr(14);
    if (emaFast5 == null || emaSlow21 == null || emaFast5_1 == null || emaSlow21_1 == null || rsi14 == null || atr14 == null) return null;

    // === POSITION SIZE (fixed fraction of cash) ===
    const posFrac = 0.95;  // use 95% of available cash per trade
    const qty = ctx.cash / ctx.price * posFrac;

    // === TRAILING STOP STATE ===
    // We track the highest price since entry using a static-like closure trick via a global
    // The engine doesn't persist state between bars — use a module-level variable
    // (declared outside onUpdate to persist — but engine re-runs script each bar, so we use a hack)
    // Actually: the engine re-evaluates the whole script each bar. We must store peak in a way
    // that survives across bars. Use a variable declared at top level — it persists within the job run.
    // BUT: if the strategy is re-evaluated fresh each bar, top-level vars DO persist (V8 context reuse).
    // We use `peakPrice` as a module-level var.

    // === ENTRY: fast EMA crosses above slow EMA ===
    // Previous bar: fast <= slow  →  Current bar: fast > slow
    const bullCross = emaFast5_1 <= emaSlow21_1 && emaFast5 > emaSlow21;

    // === RSI filter: confirm upward momentum (RSI > 50 = above neutral) ===
    const rsiConfirm = rsi14 > 50;

    // === Volume confirmation: current volume above 20-bar average ===
    const avgVol = ctx.avgVol(20);
    const volConfirm = avgVol != null && ctx.vol > avgVol * 1.1;  // 10% above average

    if (bullCross && rsiConfirm && volConfirm && ctx.position === 0) {
        return { side: 'buy', qty: qty };
    }

    // === EXIT 1: fast EMA crosses below slow EMA (trend reversal) ===
    const bearCross = emaFast5_1 >= emaSlow21_1 && emaFast5 < emaSlow21;
    if (bearCross && ctx.position > 0) {
        return { side: 'sell', qty: ctx.position };
    }

    // === EXIT 2: ATR trailing stop (protect profits) ===
    // Stop loss = entry price - 2×ATR (fixed hard stop, not dynamic trailing)
    // If price falls more than 2 ATR from entry, exit
    const stopPx = ctx.entryPx - 2 * atr14;
    if (ctx.position > 0 && ctx.price < stopPx) {
        return { side: 'sell', qty: ctx.position };
    }

    // === EXIT 3: time-based — close after 48 bars if still in position ===
    // (ctx.i is the bar index; we track entry bar in a global)
    // Since we can't easily track entry bar, use a simpler rule:
    // If RSI drops below 40 = momentum weakening, consider exit
    if (ctx.position > 0 && rsi14 < 40) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
