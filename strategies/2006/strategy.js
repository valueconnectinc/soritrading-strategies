/*
 * @coinsori-strategy v1
 * name: Bollinger Band mean reversion SOLUSDT
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Mean reversion is the winning signal family on 4H altcoins
 * in this job (BB: BTC/ETH/SUI/AVAX all promising; Stochastic: AVAX/BNB promising).
 * SOLUSDT was only tested with momentum (failed) — BB mean reversion is untested.
 * When it buys and sells: Buy when price closes below the lower Bollinger Band
 * (2σ) AND RSI < 35 (oversold) AND 20-EMA is rising (validating the bounce).
 * Sell when price touches the middle band (mean) OR RSI > 65 (overbought).
 * When it does NOT work: Fails in strong sustained downtrends where price
 * bounces off the lower band but then continues falling. Also underperforms
 * buy-and-hold in strong bull markets.
 */

function onUpdate(ctx) {
    // Indicators
    const bb = ctx.bb(20, 2);
    if (bb == null) return null;

    const rsi = ctx.rsi(14);
    if (rsi == null) return null;

    // 20-period EMA for trend filter (rising = uptrend, good for reversion)
    const ema20 = ctx.ema(20);
    if (ema20 == null) return null;

    // Previous bar values for confirmation
    const bb1 = ctx.bb(20, 2, 1);
    const rsi1 = ctx.rsi(14, 1);
    const ema20_1 = ctx.ema(20, 1);
    if (bb1 == null || rsi1 == null || ema20_1 == null) return null;

    const price = ctx.price;
    if (price == null) return null;

    // Unpack BB bands
    const lower = bb.lower;
    const mid   = bb.mid;
    const upper = bb.upper;

    // === ENTRY: price below lower band + RSI oversold + EMA rising ===
    // Price below lower band: mean reversion signal
    const belowLower = price < lower;
    // RSI oversold: confirm with momentum
    const rsiOversold = rsi < 35;
    // EMA rising: trend filter (price must be in a valid bounce context)
    const emaRising = ema20 > ema20_1;

    // Confirm previous bar was also below lower band (not just a spike)
    const prevBelowLower = ctx.closes[ctx.closes.length - 2] < bb1.lower;

    if (ctx.position === 0 && belowLower && rsiOversold && emaRising && prevBelowLower) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    // === EXIT: price at middle band OR RSI overbought ===
    const atMidBand = price >= mid;
    const rsiOverbought = rsi > 65;

    if (ctx.position > 0 && (atMidBand || rsiOverbought)) {
        return { side: 'sell', qty: ctx.position };
    }

    // === STOP-LOSS: price falls further below lower band ===
    // If price drops more than 5% below entry, tighten stop
    if (ctx.position > 0 && ctx.entryPx != null) {
        const lossPct = (ctx.entryPx - price) / ctx.entryPx;
        if (lossPct > 0.08) { // 8% stop-loss — wider than typical to let mean reversion play out
            return { side: 'sell', qty: ctx.position };
        }
    }

    return null;
}
