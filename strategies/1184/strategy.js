/*
 * @coinsori-strategy v1
 * name: EMA9/21 Crossover + RSI Confirm — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: EMA crossovers catch medium-term trend shifts; the 4H
 * timeframe balances signal frequency against noise. RSI confirms momentum
 * without being too restrictive.
 * When it buys and sells: Buys when EMA9 crosses above EMA21 AND RSI(14) > 50
 * (uptrend confirmed). Sells when EMA9 crosses below EMA21 OR RSI drops below 40.
 * When it does NOT work: In choppy, directionless markets where crossovers
 * fire repeatedly without sustaining trends —会产生大量假信号.
 */
function onUpdate(ctx) {
    // Warm-up: EMA9 needs ~20 bars, EMA21 needs ~40 bars
    if (ctx.i < 40) return null;

    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const rsi   = ctx.rsi(14);

    // Guard null indicators
    if (ema9 == null || ema21 == null || rsi == null) return null;

    // Previous bar values (ago=1 = last closed bar, safe in backtest AND live)
    const ema9_1  = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    // ── ENTRY: EMA9 crosses above EMA21, RSI confirms upward momentum ──────────
    if (ctx.position === 0) {
        const bullishCross = ema9_1 <= ema21_1 && ema9 > ema21;
        const rsiConfirm  = rsi > 50;
        if (bullishCross && rsiConfirm) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
        }
    }

    // ── EXIT: EMA9 crosses below EMA21 (trend reversal) OR RSI weak ─────────────
    if (ctx.position > 0) {
        const bearishCross = ema9_1 >= ema21_1 && ema9 < ema21;
        const rsiWeak     = rsi < 40;
        if (bearishCross || rsiWeak) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
