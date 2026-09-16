/*
 * @coinsori-strategy v1
 * name: Breakout Strategy with RSI Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy looks for breakouts above recent highs and uses RSI as a filter to avoid
 * entering trades during overbought conditions. It buys when price breaks out above
 * the highest high of the last N periods and RSI is not overbought.
 * It sells when price breaks below the lowest low of the last N periods or when RSI
 * shows an oversold condition.
 *
 * This strategy works best in ranging markets where breakouts are more frequent and
 * predictable. It does not work well in strong trending markets where prices move consistently
 * in one direction without retracements.
 */
function onUpdate(ctx) {
    // Get required indicators
    const rsi = ctx.rsi(14, 0);
    const high = ctx.high(20, 0);
    const low = ctx.low(20, 0);
    
    // Previous high and low for breakout conditions
    const prevHigh = ctx.high(20, 1);
    const prevLow = ctx.low(20, 1);
    
    // Simple breakout conditions
    const breakoutUpper = (high != null && prevHigh != null) ? 
        (ctx.price > prevHigh) : false;
        
    const breakoutLower = (low != null && prevLow != null) ? 
        (ctx.price < prevLow) : false;
    
    // RSI filter to avoid overbought/oversold conditions
    const rsiThreshold = 70; // Overbought threshold
    const oversoldThreshold = 30; // Oversold threshold
    
    // Warm-up check
    if (rsi == null || high == null || low == null || prevHigh == null || prevLow == null) {
        return null;
    }
    
    // Exit conditions for current position
    let qty = 0;
    
    // If already in a long position, look for exit signals - breakout below previous low or oversold condition
    if (ctx.position > 0) {
        // Check if price breaks below the previous low to exit long position
        if (breakoutLower) {
            return {
                side: 'sell',
                qty: ctx.position
            };
        }
        // Also exit if RSI becomes oversold (signal for reversal)
        else if (rsi < oversoldThreshold) {
            return {
                side: 'sell',
                qty: ctx.position
            };
        }
    } 
    // If not in a position, look for entry signals
    else {
        // Buy on breakout above previous high and RSI not overbought
        if (breakoutUpper && rsi < rsiThreshold) {
            qty = ctx.cash / ctx.price * 0.99; // Buy 99% of available cash
            return {
                side: 'buy',
                qty: qty
            };
        }
    }
    
    // If none of the conditions are met, do nothing
    return null;
}
