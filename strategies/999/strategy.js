/*
 * @coinsori-strategy v1
 * name: MACD + BB Reversal Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: This strategy combines MACD histogram crossovers with Bollinger Band reversals to capture trend changes and mean reversion signals. It aims for better entry timing by using MACD for trend confirmation.
 * When it buys and sells: It buys when MACD histogram turns positive and price touches the lower BB band. It sells when MACD histogram turns negative and price touches the upper BB band.
 * When it does NOT work: This strategy fails in strong trending markets where MACD does not show clear crossovers, and price continues moving without returning to the Bollinger Bands.
 */

function onUpdate(ctx) {
    // === INDICATORS ===
    const macd = ctx.macd(12, 26, 9, 0);   // MACD (12, 26, 9)
    const bb = ctx.bb(20, 2, 0);           // Bollinger Bands (20 period, 2 std dev)
    
    // === GUARD AGAINST NULL VALUES ===
    if (macd == null || bb == null) return null;
    
    // === PAST VALUES ===
    const macdPrev = ctx.macd(12, 26, 9, 1);
    const bbPrev = ctx.bb(20, 2, 1);
    
    // === GUARD AGAINST NULL VALUES (PAST) ===
    if (macdPrev == null || bbPrev == null) return null;
    
    // === TREND CONFIRMATION (MACD HISTOGRAM CROSSOVER) ===
    const isBullishCrossover = macd.hist < 0 && macdPrev.hist >= 0;  // MACD histogram crosses above zero
    const isBearishCrossover = macd.hist > 0 && macdPrev.hist <= 0;  // MACD histogram crosses below zero
    
    // === ENTRY CONDITIONS ===
    // Buy when MACD histogram turns positive (bullish crossover) and price touches lower BB
    const isBuySignal = isBullishCrossover && ctx.price <= bb.lower;
    
    // Sell when MACD histogram turns negative (bearish crossover) and price touches upper BB
    const isSellSignal = isBearishCrossover && ctx.price >= bb.upper;
    
    // === TRADE EXECUTION ===
    if (isBuySignal && ctx.position <= 0) {
        // Enter long position
        return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    
    if (isSellSignal && ctx.position > 0) {
        // Close long position
        return { side: 'sell', qty: ctx.position };
    }

    return null;
}
