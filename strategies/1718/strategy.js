/*
 * @coinsori-strategy v1
 * name: Volatility Regime Mean Reversion v2
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: v1 had 0 trades in W1 (vol-regime filter too tight at 0.85).
 * This version loosens the regime threshold to 1.1 (more trades in mixed conditions)
 * and removes the EMA200 stop (was too aggressive, cutting winners). Keeps the core
 * insight: mean reversion works best in ranging/low-vol conditions.
 * When it buys and sells: Buy when RSI crosses below 35 near lower BB. Sell when
 * RSI crosses above 65 near upper BB. Stays flat in strongly trending markets.
 * When it does NOT work: In sustained one-directional moves where RSI stays
 * extended, the strategy sits out and misses the trend.
 */

function onUpdate(ctx) {
    const rsi    = ctx.rsi(14);
    const bb     = ctx.bb(20, 2);
    const sma20  = ctx.sma(20);
    const ema50  = ctx.ema(50);

    if (rsi == null || bb == null || sma20 == null || ema50 == null) return null;

    const { upper, lower } = bb;
    const price = ctx.price;

    // --- VOLATILITY REGIME FILTER (loosened from 0.85 to 1.1) ---
    // BB width: larger = trending/volatile, smaller = ranging/calm
    const bbWidth     = upper - lower;
    const bbWidthMA   = ctx.sma(40);
    if (bbWidthMA == null) return null;

    const volRatio    = bbWidth / bbWidthMA;
    // Only skip trades when volatility is clearly expanding (strongly trending)
    const inLowVolRegime = volRatio < 1.1;  // loosened: was 0.85

    // --- ENTRY SIGNALS ---
    const rsiPrev = ctx.rsi(14, 2);
    if (rsiPrev == null) return null;

    // BUY: RSI crosses below 35 near lower BB in ranging market
    const buySignal = rsi < 35 && rsiPrev >= 35 && price <= lower * 1.02 && inLowVolRegime;

    // SELL: RSI crosses above 65 near upper BB in ranging market
    const sellSignal = rsi > 65 && rsiPrev <= 65 && price >= upper * 0.98 && inLowVolRegime;

    // --- POSITION MANAGEMENT ---
    const hasPosition = ctx.position > 0;

    // Time stop: exit if held > 60 bars (10 days on 4H) with no signal
    const entryBar = ctx.entryPx > 0 ? Math.floor(ctx.entryPx) : ctx.i;
    const barsHeld  = ctx.i - entryBar;
    const timeStop  = hasPosition && barsHeld > 60;

    // Trailing stop: if price drops 5% from entry, exit
    const trailStop = hasPosition && ctx.entryPx > 0 && price / ctx.entryPx < 0.95;

    if (!hasPosition && buySignal) {
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    if (hasPosition && (sellSignal || timeStop || trailStop)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
