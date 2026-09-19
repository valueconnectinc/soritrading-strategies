/*
 * @coinsori-strategy v1
 * name: Multi-Timeframe Momentum + OI Filter
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Combining a slow daily trend filter with faster 4H momentum
 * entries avoids buying into downtrends — the single biggest failure mode of
 * RSI-based mean reversion on volatile alts. OI change acts as a sentiment check:
 * rising OI without price confirmation signals leverage squeeze risk.
 * When it buys and sells: Buy when daily EMA21 is rising AND 4H RSI crosses above
 * 40 from below AND EMA9 > EMA21 on 4H AND volume is above average. Sell when
 * daily EMA21 turns down OR 4H RSI hits 65 OR price drops 3% from entry (stop-loss).
 * When it does NOT work: In choppy markets where daily EMA flips frequently,
 * the strategy whipsaws with small losses. Also underperforms in strong sustained
 * trends where waiting for RSI=40 delays entry and leaves profit on the table.
 */
function onUpdate(ctx) {
    // === DAILY TREND FILTER ===
    // Use EMA21 on daily equivalent: 6 x 4h bars = ~daily
    const dailyEma21_4h = ctx.ema(21 * 6);
    if (dailyEma21_4h == null) return null;

    // === 4H MOMENTUM INDICATORS ===
    const ema9  = ctx.ema(9);
    const ema21 = ctx.ema(21);
    const rsi   = ctx.rsi(14);
    if (ema9 == null || ema21 == null || rsi == null) return null;

    // === VOLUME CONFIRMATION ===
    const avgVol = ctx.avgVol(20);
    if (avgVol == null) return null;
    const volRatio = ctx.vol / avgVol;

    // === RSI MOMENTUM CROSSOVER (4H) ===
    const rsiPrev = ctx.rsi(14, 1);
    if (rsiPrev == null) return null;

    // === OI SENTIMENT CHECK (optional — skip if data unavailable) ===
    let oiOk = true;
    try {
        const oiData = ctx.binanceOi();
        if (oiData && oiData.openInterest && oiData.price) {
            const oiChg = oiData.oiChangePct || 0;
            const pricePrev = oiData.price.prev || ctx.price;
            const priceChg = (ctx.price - pricePrev) / pricePrev;
            if (oiChg > 5 && priceChg < 0.005) {
                oiOk = false;
            }
        }
    } catch (e) {
        oiOk = true;
    }

    // === ENTRY ===
    if (ctx.position === 0) {
        const dailyRising   = ctx.price > dailyEma21_4h;
        const fourHBullish  = ema9 > ema21;
        const rsiCrossUp    = rsiPrev < 40 && rsi >= 40;
        const volConfirm    = volRatio > 1.2;
        const entryOk       = dailyRising && fourHBullish && rsiCrossUp && volConfirm && oiOk;

        if (entryOk) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    }

    // === EXIT ===
    if (ctx.position > 0) {
        const dailyBearish = ctx.price < dailyEma21_4h;
        const rsiExhausted = rsi > 65;
        const stopHit      = ctx.entryPx > 0 && (ctx.entryPx - ctx.price) / ctx.entryPx > 0.03;

        if (dailyBearish || rsiExhausted || stopHit) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
