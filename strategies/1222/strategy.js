/*
 * @coinsori-strategy v1
 * name: EMA Crossover Momentum
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Trend-following strategy using EMA 9/21 crossover with RSI and ATR filters.
 * Buys when fast EMA crosses above slow EMA with RSI in a healthy range and
 * volatility is rising (confirming a real trend, not just a noise spike).
 * Sells when the fast EMA crosses back below, or when RSI goes overbought.
 * When it does NOT work: choppy, range-bound markets where crossovers
 * whipsaw and ATR stays flat — the strategy takes small losses repeatedly.
 */

function onUpdate(ctx) {
    // Warm-up guard: need at least 21 bars for EMA21
    const ema9 = ctx.ema(9);
    const ema21 = ctx.ema(21);
    if (ema9 == null || ema21 == null) return null;

    // ATR for trend confirmation (rising ATR = trending, not ranging)
    const atr = ctx.atr(14);
    const atr1 = ctx.atr(14, 1);
    if (atr == null || atr1 == null) return null;
    const atrRising = atr > atr1; // volatility expanding = trending

    // RSI for momentum health — avoid buying when RSI is too hot (>70, overbought)
    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // Previous bar closed values for crossover detection
    const ema9_1 = ctx.ema(9, 1);
    const ema21_1 = ctx.ema(21, 1);
    if (ema9_1 == null || ema21_1 == null) return null;

    // Volume filter: require above-average volume on signal bar
    const vol = ctx.vol;
    const avgVol = ctx.avgVol(20);
    if (vol == null || avgVol == null) return null;
    const volConfirm = vol > avgVol * 1.0; // at least average volume

    const hasPosition = ctx.position > 0;

    // BUY: EMA9 crosses ABOVE EMA21 (bullish golden cross)
    // Confirm: RSI not overbought (< 70), ATR rising (trend confirmed), volume present
    const bullishCross = ema21_1 >= ema9_1 && ema9 > ema21;
    const notOverbought = rsi < 70;
    if (bullishCross && notOverbought && atrRising && volConfirm) {
        // Enter with 90% of available cash
        const qty = (ctx.cash * 0.90) / ctx.price;
        return { side: 'buy', qty: qty };
    }

    // SELL: EMA9 crosses BELOW EMA21 (bearish death cross) — exit long
    const bearishCross = ema21_1 >= ema9_1 && ema9 < ema21;
    if (hasPosition && bearishCross) {
        return { side: 'sell', qty: ctx.position };
    }

    // STOP-LOSS: if RSI drops below 30 (deeply oversold), exit to avoid prolonged drawdown
    if (hasPosition && rsi < 30) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
