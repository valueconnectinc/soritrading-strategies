/*
 * @coinsori-strategy v1
 * name: EMA20 Trend + MACD Momentum + Volume Confirmation
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: MACD histogram cross catches momentum shifts earlier than price crossovers and is less noisy on 4H. Combined with EMA20 trend filter (avoid counter-trend entries) and volume confirmation (filter fake breakouts), it targets SOL's trending moves while avoiding whipsaws that plagued pure EMA crossover.
 * When it buys and sells: Buy when EMA20 is rising (bullish trend), MACD histogram crosses above 0 (momentum shifting bullish), and volume is above its 20-bar average (confirmed move). Sell when MACD histogram crosses below 0 or price closes below EMA20.
 * When it does NOT work: In choppy, low-volume markets where MACD oscillates around 0 without clean crosses — generates false signals. Also fails in sudden sharp reversals where volume spikes on the wrong side.
 */

function onUpdate(ctx) {
    // Warm-up guards
    const ema20 = ctx.ema(20, 0);
    const ema20_1 = ctx.ema(20, 1);
    const macdCur = ctx.macd(12, 26, 9, 0);
    const macdPrev = ctx.macd(12, 26, 9, 1);
    const macdPrev2 = ctx.macd(12, 26, 9, 2);
    const avgVol = ctx.avgVol(20);
    const atr = ctx.atr(14, 0);

    if (ema20 == null || ema20_1 == null) return null;
    if (macdCur == null || macdPrev == null || macdPrev2 == null) return null;
    if (avgVol == null || avgVol <= 0) return null;
    if (atr == null) return null;

    // Position sizing: risk 2% of cash per trade
    const riskAmount = ctx.cash * 0.02;
    const stopDistance = atr * 2; // 2× ATR stop
    const qty = riskAmount / stopDistance;

    // === CLOSE LOGIC ===
    // Exit if MACD histogram crosses back below 0 (momentum lost)
    if (ctx.position > 0) {
        const histCur = macdCur.macd - macdCur.signal;
        const histPrev = macdPrev.macd - macdPrev.signal;

        // Exit on momentum flip or price below EMA20
        if ((histPrev >= 0 && histCur < 0) || ctx.price < ema20) {
            return { side: 'sell', qty: ctx.position };
        }
        return null;
    }

    // === ENTRY LOGIC ===
    // 1. EMA20 must be rising — confirmed uptrend
    const emaRising = ema20 > ema20_1;
    if (!emaRising) return null;

    // 2. MACD histogram crosses above 0 — momentum shifting bullish
    const histCur = macdCur.macd - macdCur.signal;
    const histPrev = macdPrev.macd - macdPrev.signal;
    const histPrev2 = macdPrev2.macd - macdPrev2.signal;

    const macdBullCross = histPrev2 < 0 && histPrev >= 0 && histCur > 0;
    if (!macdBullCross) return null;

    // 3. Volume confirmation — current bar volume above 20-bar average
    const volConfirm = ctx.vol > avgVol;
    if (!volConfirm) return null;

    // All conditions met — enter long
    return { side: 'buy', qty: qty };
}
