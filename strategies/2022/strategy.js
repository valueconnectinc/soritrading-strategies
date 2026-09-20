/*
 * @coinsori-strategy v1
 * name: EMA Momentum Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: SOL is a high-beta momentum asset — it tends to make sustained directional moves. This strategy follows the trend using EMA(20) as a trend filter and enters on pullbacks that hold above the EMA, targeting the next push higher.
 * When it buys and sells: Buys when price is above EMA20 (uptrend) and RSI(14) pulls back to 40-50 range, then rises. Sells when price crosses below EMA20 or RSI hits 70 (overbought).
 * When it does NOT work: Fails in choppy, directionless markets where price oscillates around EMA20 without trending — each EMA cross triggers a loss. Also fails in sharp reversals where the stop is hit before the trend resumes.
 */

function onUpdate(ctx) {
    // Warm-up: need at least 20 bars for EMA and BB
    if (ctx.i < 20) return null;

    const ema20 = ctx.ema(20);
    const rsi = ctx.rsi(14);
    const bb = ctx.bb(20, 2);
    const atr = ctx.atr(14);

    if (ema20 == null || rsi == null || bb == null || atr == null) return null;

    const price = ctx.price;
    const position = ctx.position;

    // ── EXIT LOGIC ──────────────────────────────────────────────
    if (position > 0) {
        // Exit 1: price crosses below EMA20 (trend reversal)
        if (price < ema20) {
            return { side: 'sell', qty: position };
        }
        // Exit 2: RSI overbought zone
        if (rsi > 70) {
            return { side: 'sell', qty: position };
        }
        // Exit 3: ATR-based trailing stop — stop if price drops 2x ATR from peak
        // Use ctx.sma(20) as a soft stop anchor
        const sma20 = ctx.sma(20);
        if (sma20 != null && price < sma20 * 0.98) {
            return { side: 'sell', qty: position };
        }
        return null;
    }

    // ── ENTRY LOGIC ─────────────────────────────────────────────
    if (position === 0) {
        // Trend is UP: price above EMA20
        if (price <= ema20) return null;

        // RSI pullback: between 40 and 50, and RSI is rising this bar vs previous
        const prevRSI = ctx.rsi(14, 1);
        if (prevRSI == null) return null;

        if (rsi < 40 || rsi > 50) return null;
        if (rsi <= prevRSI) return null; // RSI must be recovering

        // ATR filter: only enter when volatility is not extremely low (avoid chop)
        // Low ATR percentile = boring market, skip
        const vol = ctx.avgVol(20);
        if (vol != null && ctx.vol < vol * 0.5) return null; // skip if volume is very low

        // Stop loss: 2x ATR below entry
        const stopPx = price - 2 * atr;

        // Position sizing: risk 2% of cash per trade
        const riskAmt = ctx.cash * 0.02;
        const qty = riskAmt / (price - stopPx);

        if (qty <= 0) return null;

        return {
            side: 'buy',
            qty: qty,
            // Use smart order to get a reasonable fill
            type: 'smart',
            // Set a limit price slightly above market to ensure fill
            price: price * 1.001,
            postOnly: false
        };
    }

    return null;
}
