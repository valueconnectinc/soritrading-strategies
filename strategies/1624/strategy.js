/*
 * @coinsori-strategy v1
 * name: ATR Volatility Breakout
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * A volatility-adjusted breakout strategy. Buys when price closes above
 * the upper ATR channel (SMA + 2×ATR) — the channel widens with volatility
 * so a breakout signals both price momentum AND expanding market energy.
 * Sells when price closes below the lower ATR channel OR when ATR
 * contracts below its own 20-bar SMA (trend losing steam).
 * Different from Donchian (fixed period) and BB (stddev-based) — ATR
 * channels adjust to SOL's actual volatility regime.
 * When it does NOT work: choppy markets where price oscillates around
 * the channel without committing to a direction — false breakouts erode
 * capital through whipsaws.
 */
function onUpdate(ctx) {
    // ── Indicators ──────────────────────────────────────────────────────
    const atr    = ctx.atr(14, 0);  // current ATR
    const atr_1  = ctx.atr(14, 1);  // confirmed ATR
    const atr_2  = ctx.atr(14, 2);  // 2 bars ago
    const sma20  = ctx.sma(20, 0);  // current SMA (channel base)
    const sma20_1 = ctx.sma(20, 1); // confirmed SMA
    const close1 = ctx.closes[1];   // confirmed close

    if (atr == null || atr_1 == null || atr_2 == null || sma20 == null || sma20_1 == null || close1 == null) {
        return null;
    }

    // ── ATR average (20-bar SMA of ATR) ─────────────────────────────────
    // Used to detect ATR expansion vs contraction
    let atrSum = 0;
    let atrCount = 0;
    for (let i = 0; i < 20; i++) {
        const a = ctx.atr(14, i);
        if (a != null) { atrSum += a; atrCount++; }
    }
    // Require at least 15 bars for a stable average
    const atrAvgVal = atrCount >= 15 ? atrSum / atrCount : null;
    if (atrAvgVal == null) return null;

    // ── Channel levels (using confirmed ATR) ────────────────────────────
    // Upper = SMA + 2×ATR (bullish breakout ceiling)
    // Lower = SMA - 2×ATR (bearish breakdown floor)
    const upper = sma20_1 + 2 * atr_1;
    const lower = sma20_1 - 2 * atr_1;

    // ── Entry signals ───────────────────────────────────────────────────
    // 1. Price closes above upper ATR channel (confirmed bar)
    const aboveUpper = close1 > upper;
    // 2. ATR is expanding (above its 20-bar average) — volatility confirms trend
    const atrExpanding = atr_1 > atrAvgVal;
    // 3. Price above SMA (overall uptrend alignment)
    const aboveSMA = close1 > sma20_1;

    // ── Exit signals ────────────────────────────────────────────────────
    // Price closes below lower channel: trend reversed
    const belowLower = close1 < lower;
    // ATR contracting: volatility squeeze, trend losing energy
    const atrContracting = atr_1 < atrAvgVal;

    // ── BUY ─────────────────────────────────────────────────────────────
    if (ctx.position === 0 && aboveUpper && atrExpanding && aboveSMA) {
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }

    // ── SELL ────────────────────────────────────────────────────────────
    if (ctx.position > 0 && (belowLower || atrContracting)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
