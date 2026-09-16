/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses the Relative Strength Index (RSI) to identify overbought and oversold conditions.
 * When RSI falls below 30, it's considered oversold — a buy signal. When it rises above 70, it's overbought — a sell signal.
 * The strategy aims to capture mean reversion opportunities within the RSI range.
 *
 * It buys when RSI drops below 30 and sells when RSI goes above 70.
 * No additional filters are used to keep the strategy simple.
 * 
 * This approach works best in ranging markets where price tends to revert to the mean.
 * The strategy does not work well during strong trending markets where RSI may stay in overbought or oversold for extended periods.
 */

function onUpdate(ctx) {
  // Get RSI values with 14-period settings (default)
  const rsi = ctx.rsi(14, 0);     // Current RSI
  const rsiPrev = ctx.rsi(14, 1); // Previous RSI
  
  // Guard against null values (warm-up period)
  if (rsi == null || rsiPrev == null) return null;
  
  // RSI crossover logic
  // If previous RSI was overbought (>70) and current is below 70, we might close a short position or open a long
  if (rsiPrev >= 70 && rsi < 70) {
    // RSI crossed back below 70 — possible reversal signal (sell)
    // But since we're in a buy/sell pattern with no position, this should be handled by the logic below
    
    // For now, let's simply follow a straightforward RSI strategy:
    // Buy when RSI drops below 30 (oversold) and sell when RSI goes above 70 (overbought)
  }

  // Buy condition: if current RSI is below 30 (oversold)
  if (rsi < 30 && ctx.position <= 0) {
    // Enter a long position with 99% of available cash
    return { 
      side: 'buy', 
      qty: ctx.cash / ctx.price * 0.99 
    };
  }

  // Sell condition: if current RSI is above 70 (overbought)
  if (rsi > 70 && ctx.position > 0) {
    // Close the existing long position
    return { 
      side: 'sell', 
      qty: ctx.position 
    };
  }

  // No action needed
  return null;
}
