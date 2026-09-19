/*
 * @coinsori-strategy v1
 * name: ATR Volatility Breakout v2
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: ATR channels adjust to SOL's actual volatility regime
 * (unlike fixed-period Donchian). Combined with EMA20 rising trend guard,
 * this filters out false breakouts in choppy markets. Captures volatility
 * expansion during genuine trends — different signal family from RSI pullback.
 * When it buys and sells: BUY when price closes above upper ATR channel
 * (SMA + 2×ATR) while EMA20 is rising (confirmed uptrend). SELL when price
 * closes below lower ATR channel OR when ATR contracts below its average.
 * When it does NOT work: in strong downtrends where ATR expands but price
 * falls — the EMA20 rising guard prevents shorts so only missed opportunities
 * are the cost. Also fails in low-volatility squeeze phases.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────
    const atr_1  = ctx.atr(14, 1);  // confirmed ATR
    const atr_2  = ctx.atr(14, 2);  // 2 bars ago
    const sma20_1 = ctx.sma(20, 1); // confirmed SMA
    const sma20_2 = ctx.sma(20, 2); // previous SMA (for trend)
    const close1 = ctx.closes[1];   // confirmed close

    // EMA for trend guard
    const ema20_1 = ctx.ema(20, 1);
    const ema20_2 = ctx.ema(20, 2);

    if (atr_1 == null || atr_2 == null || sma20_1 == null || sma20_2 == null || close1 == null) return null;
    if (ema20_1 == null || ema20_2 == null) return null;

    // ── ATR average (20-bar SMA of ATR) ─────────────────────────────────
    let atrSum = 0, atrCount = 0;
    for (let i = 1; i <= 20; i++) {         // use confirmed bars only (ago >= 1)
        const a = ctx.atr(14, i);
        if (a != null) { atrSum += a; atrCount++; }
    }
    const atrAvgVal = atrCount >= 15 ? atrSum / atrCount : null;
    if (atrAvgVal == null) return null;

    // ── Channel levels ───────────────────────────────────────────────────
    const upper = sma20_1 + 2 * atr_1;
    const lower = sma20_1 - 2 * atr_1;

    // ── Trend guard ──────────────────────────────────────────────────────
    // EMA20 rising = confirmed short-term uptrend. Prevents buying breakouts
    // in choppy/sideways markets where ATR channels produce false signals.
    // This is the same guard that made EMA20+RSI pullback work (Exp 382).
    const emaRising = ema20_1 > ema20_2;

    // ── Entry signals ───────────────────────────────────────────────────
    const aboveUpper    = close1 > upper;
    const atrExpanding  = atr_1 > atrAvgVal;  // volatility confirming trend
    const aboveSMA      = close1 > sma20_1;

    // ── Exit signals ─────────────────────────────────────────────────────
    const belowLower     = close1 < lower;
    const atrContracting = atr_1 < atrAvgVal;

    // ── BUY ─────────────────────────────────────────────────────────────
    if (ctx.position === 0 && aboveUpper && atrExpanding && aboveSMA && emaRising) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── SELL ────────────────────────────────────────────────────────────
    if (ctx.position > 0 && (belowLower || atrContracting)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
