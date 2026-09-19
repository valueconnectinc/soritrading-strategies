/*
 * @coinsori-strategy v1
 * name: Volatility Regime Mean Reversion
 * ex: binance
 * syms: AVAXUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Most AVAXUSDT 4H mean-reversion strategies fail in bull trending markets.
 * This adds a volatility-regime filter — it only trades when Bollinger Band width is contracting
 * (choppy/ranging), and stays flat in trending markets (expanding bandwidth). This should fix
 * the bull-market underperformance that plagued every prior strategy on this pair.
 * When it buys and sells: Buy when RSI crosses below 35 (near lower BB) during low-vol regime.
 * Sell when RSI crosses above 65 (near upper BB) during low-vol regime. Flat in trending markets.
 * When it does NOT work: In strongly trending markets where RSI stays extended for weeks,
 * the strategy sits out and misses the move. Also fails if volatility regime switches
 * rapidly, causing whipsaws.
 */

function onUpdate(ctx) {
    // --- INDICATORS ---
    const rsi = ctx.rsi(14);
    const bb = ctx.bb(20, 2);
    const sma20 = ctx.sma(20);
    const ema50 = ctx.ema(50);
    const ema200 = ctx.ema(200);

    // Need at least 200 bars for EMA200
    if (rsi == null || bb == null || sma20 == null || ema50 == null || ema200 == null) return null;

    const { upper, lower, mid } = bb;
    const price = ctx.price;

    // --- VOLATILITY REGIME FILTER ---
    // BB width: larger = trending/volatile, smaller = ranging/calm
    const bbWidth = upper - lower;
    const bbWidthMA = ctx.sma(40); // longer lookback for regime
    if (bbWidthMA == null) return null;

    // Normalize: is current bandwidth below its moving average?
    // Below = ranging (good for mean reversion), Above = trending (stay flat)
    const volRatio = bbWidth / bbWidthMA;

    // Only trade when volatility is below its recent average (ranging market)
    // This ratio < 0.85 means bandwidth is contracting — choppy conditions
    const inLowVolRegime = volRatio < 0.85;

    // --- TREND FILTER (optional — stay out of strong downtrends) ---
    // Only enter if price is above EMA50 (not a major downtrend)
    // This avoids "catching falling knives" in clear bear markets
    const inUptrend = price > ema50;
    const inLongTermUptrend = price > ema200;

    // --- ENTRY: BUY — RSI at lower band in ranging market ---
    // RSI crosses below 35 while price is near/at below lower BB
    // Confirm: low-vol regime + price above EMA50 (not in crash)
    const rsiPrev = ctx.rsi(14, 2); // previous bar RSI
    if (rsiPrev == null) return null;

    const buySignal = rsi < 35 && rsiPrev >= 35 && price <= lower * 1.02 && inLowVolRegime && inUptrend;

    // --- EXIT: SELL — RSI at upper band in ranging market ---
    // RSI crosses above 65 while price is near/at upper BB
    const sellSignal = rsi > 65 && rsiPrev <= 65 && price >= upper * 0.98 && inLowVolRegime;

    // --- POSITION MANAGEMENT ---
    const hasPosition = ctx.position > 0;

    // Stop-loss: if price drops below EMA200, exit regardless (major breakdown)
    const stopLoss = price < ema200;

    // Time-based exit: if held > 48 bars (8 days on 4H) with no exit signal, exit at market
    const barsHeld = ctx.i - (ctx.entryPx > 0 ? Math.floor(ctx.entryPx) : ctx.i);
    const timeStop = hasPosition && barsHeld > 48;

    // Execute orders
    if (!hasPosition && buySignal) {
        // Market buy with 99% of cash
        return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }

    if (hasPosition && (sellSignal || stopLoss || timeStop)) {
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
