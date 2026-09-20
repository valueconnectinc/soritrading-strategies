/*
 * @coinsori-strategy v1
 * name: Stochastic RSI Momentum v2
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Stochastic RSI catches reversals earlier than plain RSI by
 * measuring where RSI sits within its recent range. Loosening the oversold gate
 * from K<20 to K<40 because ETH rarely dips that deep — the first version
 * generated only 0-6 trades per window.
 * When it buys and sells: Buys when Stochastic K crosses above D below 40
 * (recovering from weakness) with RSI confirming (> 45) and SMA20 in uptrend.
 * Sells when K crosses below D above 60, or after 20 bars, or if price breaks
 * below SMA20 (trend loss).
 * When it does NOT work: Strong trending markets — K/D oscillates between
 * 30-70 in a clean uptrend, generating no entries or late entries at the top.
 */
function onUpdate(ctx) {
    // Stochastic: 14-period K, 3-period D
    const stoch1 = ctx.stoch(14, 3, 0);
    const stoch2 = ctx.stoch(14, 3, 1);
    if (stoch1 == null || stoch2 == null) return null;
    const K1 = stoch1.k, D1 = stoch1.d;
    const K2 = stoch2.k, D2 = stoch2.d;
    if (K1 == null || D1 == null || K2 == null || D2 == null) return null;

    // RSI confirmation
    const rsi0 = ctx.rsi(14, 0);
    const rsi1 = ctx.rsi(14, 1);
    if (rsi0 == null || rsi1 == null) return null;

    // Trend filter: SMA20 rising (price above it and slope positive)
    const sma20 = ctx.sma(20, 0);
    const sma1 = ctx.sma(20, 1);
    if (sma20 == null || sma1 == null) return null;
    const trendUp = ctx.price > sma20 && sma20 > sma1;

    // Volume: expanding vs 20-bar average
    const avgVol = ctx.avgVol(20);
    const vol0 = ctx.vol;
    if (avgVol == null || vol0 == null) return null;
    const volConfirm = vol0 > avgVol;

    // === ENTRY ===
    // K crosses above D while recovering (K1 > D1, K2 <= D2)
    // Both below 40 = not overbought, room to run
    // RSI confirming recovery: rising and above 45
    // Trend is up (SMA20 rising)
    const enterLong = K2 <= D2 && K1 > D1
        && K1 < 40 && D1 < 40
        && rsi0 > 45 && rsi0 > rsi1
        && trendUp;

    if (enterLong && ctx.position === 0) {
        // Track entry bar in persistent state
        ctx.state.entryBar = ctx.i;
        ctx.log('BUY: Stoch K>D recovering K=' + K1.toFixed(1) + ' RSI=' + rsi0.toFixed(1));
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // === EXIT conditions ===
    const KcrossDown = K2 >= D2 && K1 < D1 && K1 > 60 && D1 > 60;
    const trendLost = ctx.price < sma20 && sma20 <= sma1;

    // Max hold: 20 bars (3.3 days on 4h)
    const entryBar = ctx.state.entryBar || 0;
    const barsHeld = (entryBar > 0) ? ctx.i - entryBar : 999;
    const maxHold = 20;

    if (ctx.position > 0 && (KcrossDown || trendLost || barsHeld >= maxHold)) {
        const reason = KcrossDown ? 'K>D overbought' : (trendLost ? 'trend lost' : 'max hold');
        ctx.log('SELL: ' + reason + ' barsHeld=' + barsHeld);
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
