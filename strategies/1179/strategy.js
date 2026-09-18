/*
 * @coinsori-strategy v1
 * name: DXY Macro Regime + EMA Momentum — BTCUSDT 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Uses DXY (US Dollar Index) as a macro regime filter: when the dollar is
 * weakening (DXY falling), BTC tends to appreciate. This strategy only takes
 * long positions when DXY is below its SMA(20) — confirming dollar weakness.
 * Entry timing uses EMA(9,21) crossover. Exit is the opposite crossover.
 * When it does NOT work: when BTC decouples from the dollar (e.g., 2024 ETF
 * narrative drove BTC up even with a strong dollar). DXY is a soft filter,
 * not a hard rule — the strategy still trades in non-ideal regimes but with
 * reduced conviction.
 */

function onUpdate(ctx) {
    // --- Macro regime: DXY ---
    const dxy     = ctx.macro('dxy');
    const dxySMA  = ctx.sma(20);          // DXY 20-period SMA (ago=1 = closed bar)
    if (dxy == null || dxySMA == null) return null;
    const dxyVal  = dxy.value;
    if (dxyVal == null) return null;

    // Dollar weakness regime: DXY below its SMA → bullish bias
    const dollarWeak = dxyVal < dxySMA;

    // --- Price momentum: EMA crossover ---
    const ema9  = ctx.ema(9, 1);
    const ema21 = ctx.ema(21, 1);
    const ema9p = ctx.ema(9, 2);   // previous bar (closed)
    const ema21p= ctx.ema(21, 2);
    if (ema9 == null || ema21 == null || ema9p == null || ema21p == null) return null;

    const bullishCross = ema9p <= ema21p && ema9 > ema21;  // EMA9 crosses above EMA21
    const bearishCross = ema9p >= ema21p && ema9 < ema21;  // EMA9 crosses below EMA21

    // --- Position logic ---
    if (ctx.position === 0) {
        // Entry: bullish EMA cross AND dollar is weak
        if (bullishCross && dollarWeak) {
            return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
        }
    } else {
        // Exit: bearish EMA cross (momentum shifted)
        if (bearishCross) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
