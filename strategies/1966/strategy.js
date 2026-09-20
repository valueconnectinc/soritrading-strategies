/*
 * @coinsori-strategy v1
 * name: Stochastic RSI Momentum
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Stochastic RSI catches reversals earlier than plain RSI by
 * measuring where RSI sits within its recent range — a reading of 0 means RSI is
 * at its lowest in 14 bars, a reading of 100 means it's at the highest.
 * When both K and D dip below 20 and K crosses above D, the bounce signal is
 * stronger than RSI alone because it confirms RSI is at a relative extreme.
 * When it buys and sells: Buys when Stochastic K crosses above D in oversold
 * territory (< 20) with RSI confirming recovery (> 40) and volume expanding.
 * Sells when K crosses below D in overbought territory (> 80) or after 24 bars.
 * When it does NOT work: Choppy sideways markets cause repeated whipsaws — K/D
 * oscillates around 20/80 without clean crossovers, burning small losses each time.
 */

function onUpdate(ctx) {
    // Stochastic with default 14-period K, 3-period D
    const stoch1 = ctx.stoch(14, 3, 0);
    const stoch2 = ctx.stoch(14, 3, 1);
    const stoch3 = ctx.stoch(14, 3, 2);
    if (stoch1 == null || stoch2 == null || stoch3 == null) return null;

    const K1 = stoch1.k, D1 = stoch1.d;
    const K2 = stoch2.k, D2 = stoch2.d;
    const K3 = stoch3.k, D3 = stoch3.d;
    if (K1 == null || D1 == null || K2 == null || D2 == null) return null;

    // RSI for confirmation — only enter when RSI is recovering (not still falling)
    const rsi0 = ctx.rsi(14, 0);
    const rsi1 = ctx.rsi(14, 1);
    if (rsi0 == null || rsi1 == null) return null;

    // Volume confirmation: today's volume above 20-bar average
    const avgVol = ctx.avgVol(20);
    const vol0 = ctx.vol;
    if (avgVol == null || vol0 == null) return null;
    const volConfirm = vol0 > avgVol;

    // === ENTRY: K crosses above D in oversold, RSI confirming recovery ===
    // K2 <= D2: was at or below D (crossing up); K1 > D1: now above D
    // Both readings below 20 = oversold
    // RSI recovering: rsi0 > rsi1 (rising) and RSI above 40 (not still crashing)
    const enterLong = K2 <= D2 && K1 > D1
        && K1 < 20 && D1 < 20
        && rsi0 > 40
        && rsi0 > rsi1;

    if (enterLong && ctx.position === 0) {
        // Volume confirmation preferred but not required if K/D signal is strong
        if (volConfirm) {
            ctx.log('BUY: Stoch K>D in oversold, RSI recovering, vol expanding');
        }
        return {
            side: 'buy',
            qty: ctx.cash / ctx.price * 0.99
        };
    }

    // === EXIT: K crosses below D in overbought, or max hold 24 bars ===
    const KcrossDown = K2 >= D2 && K1 < D1 && K1 > 80 && D1 > 80;
    const barsHeld = ctx.position > 0 ? ctx.i - ctx.entryPx : 999;
    const maxHold = 24; // 4 days on 4h chart

    if ((KcrossDown || barsHeld >= maxHold) && ctx.position > 0) {
        ctx.log('SELL: Stoch K<D in overbought or max hold reached');
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
