/*
 * @coinsori-strategy v1
 * name: Volume-Weighted RSI + EMA Confirmation
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Uses volume-weighted RSI as the primary entry signal and EMA for trend
 * confirmation. Buys when RSI dips into oversold with above-average volume
 * and price above EMA (confirming uptrend). Sells when RSI reaches overbought
 * or when price crosses below EMA.
 * When it does NOT work: In strong trending markets where RSI stays extended
 * for long periods, entries are missed. In low-volume chop, volume filter
 * may cause false signals.
 */

function onUpdate(ctx) {
    // Warm-up: need enough bars for all indicators
    const emaFast = ctx.ema(9);
    const emaSlow = ctx.ema(21);
    const rsi = ctx.rsi(14);
    const atr = ctx.atr(14);
    const avgVol = ctx.avgVol(20);

    // Need all indicators to be valid
    if (emaFast == null || emaSlow == null || rsi == null || atr == null || avgVol == null) return null;
    if (avgVol === 0) return null;

    const price = ctx.price;
    const vol = ctx.vol;

    // Volume must be above 20-bar average (confirming move strength)
    const volConfirm = vol > avgVol * 1.0; // allow entries at average volume

    // Trend: price above EMA21 = uptrend
    const inUptrend = price > emaSlow;

    // RSI oversold threshold — buy when RSI recovers from below 35
    const rsiPrev = ctx.rsi(14, 1);
    const rsiPrev2 = ctx.rsi(14, 2);

    // Entry: RSI crossed above 35 from below, in uptrend, volume confirms
    const rsiRecovering = rsiPrev != null && rsiPrev2 != null &&
        rsiPrev2 <= 35 && rsiPrev > 35 && rsi > 35;

    // Alternative entry: RSI below 40 with strong momentum (3-bar RSI rising)
    const rsiRising = rsiPrev != null && rsiPrev2 != null &&
        rsi > 40 && rsi < 65 &&
        rsi > rsiPrev && rsiPrev > rsiPrev2; // RSI in upward mode

    const strongBuy = rsiRecovering || (rsiRising && inUptrend && volConfirm);

    // === ENTRY ===
    if (ctx.position === 0 && strongBuy) {
        // ATR-based position sizing: risk 2% of equity per trade
        const riskAmount = ctx.cash * 0.02;
        const stopPx = price - 2 * atr;
        const qty = riskAmount / (price - stopPx);
        return { side: 'buy', qty: qty * 0.99 };
    }

    // === EXIT ===
    if (ctx.position > 0) {
        // Sell if RSI overbought
        const rsiOverbought = rsi > 70;

        // Sell if price crosses below EMA21 (trend reversal)
        const priceBelowEma = price < emaSlow;

        // Sell if RSI diverging down (top formation)
        const rsiDiverging = rsiPrev != null && rsiPrev2 != null &&
            rsi < rsiPrev && rsiPrev < rsiPrev2 && rsi > 60;

        if (rsiOverbought || priceBelowEma || rsiDiverging) {
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
