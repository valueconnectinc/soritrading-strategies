/*
 * @coinsori-strategy v1
 * name: EMA Crossover + RSI Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The EMA9/21 crossover strategy (1709) showed promise — it's
 * momentum-following, not mean reversion, so it doesn't sell too early in bull
 * markets. Strategy 2037 (funding/OI filter) had 56 trades but underperformed in
 * bull markets because it used mean-reversion exits. This version uses pure
 * momentum logic: buy when EMA9 crosses above EMA21 AND RSI is in the 40-70 zone
 * (avoiding entries when RSI is already extreme, which often precedes reversals).
 *
 * When it buys and sells: Buy on EMA9/21 golden cross when RSI is between 40
 * and 70 — not overbought, not oversold. Sell on death cross (EMA9 crosses below
 * EMA21) or if RSI drops below 35 (momentum fading). No position if RSI > 70 at
 * cross (overbought — likely a false signal).
 *
 * When it does NOT work: In choppy markets where EMA9/21 oscillate frequently —
 * each cross triggers a trade, accumulating fees. Also fails in very slow trends
 * where the 4h EMA crossover is too lagging to capture meaningful moves.
 */
function onUpdate(ctx) {
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const rsi   = ctx.rsi(14);
    if (ema9 == null || ema21 == null || rsi == null) return null;

    // Read previous bar to detect crossover (ago=1 = closed bar)
    const ema9_1  = ctx.ema(9,  1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    const price    = ctx.price;
    const position = ctx.position;

    // === GOLDEN CROSS: EMA9 crosses above EMA21 ===
    const goldenCross = ema9_1 <= ema21_1 && ema9 > ema21;

    // === DEATH CROSS: EMA9 crosses below EMA21 ===
    const deathCross = ema9_1 >= ema21_1 && ema9 < ema21;

    // === ENTRY: golden cross + RSI in the "confirming" zone ===
    // RSI 40-70: not oversold (avoid catching falling knife), not overbought
    // (avoid buying at the top of a rally)
    if (!position && goldenCross && rsi >= 40 && rsi <= 70) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: death cross OR RSI drops below 35 (momentum fading) ===
    if (position && (deathCross || rsi < 35)) {
        return { side: 'sell', qty: position };
    }

    return null;
}
