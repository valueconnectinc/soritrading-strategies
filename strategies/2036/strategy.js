/*
 * @coinsori-strategy v1
 * name: RSI-BB Mean Reversion + Trend Filter
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The previous RSI-BB version (2036) beat benchmarks in bear/sideways
 * markets but badly underperformed in bull markets — it sold at the BB upper band too early,
 * missing the rest of the rally. Adding an EMA trend filter prevents entries when BTC is
 * in a strong uptrend, so the strategy skips the regime where mean reversion fails.
 *
 * When it buys and sells: Only buy when (1) RSI < 30, (2) price touches lower BB, AND
 * (3) EMA9 is ABOVE EMA21 (confirmed uptrend — oversold in an uptrend is a pullback to buy).
 * Sell when RSI > 70 OR price reaches upper BB — take profit when price bounces.
 * No position taken if EMA9 is below EMA21 (downtrend — mean reversion too risky there too).
 *
 * When it does NOT work: In strong one-directional bear markets — the trend filter keeps
 * you out, which is correct, but you also miss the bounce trades that would have been huge.
 * Also fails if BTC oscillates above/below the EMAs repeatedly (noisy trend).
 */
function onUpdate(ctx) {
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    if (ema9 == null || ema21 == null) return null;

    const price    = ctx.price;
    const position = ctx.position;

    // Trend filter: EMA9 must be above EMA21 for a valid long entry
    // This skips entries during downtrends and weak/noisy trends
    const bullTrend = ema9 > ema21;

    // === ENTRY: oversold + BB lower touch + confirmed uptrend ===
    if (!position && rsi < 30 && price <= bb.lower && bullTrend) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: overbought OR BB upper touch ===
    if (position && (rsi > 70 || price >= bb.upper)) {
        return { side: 'sell', qty: position };
    }

    return null;
}
