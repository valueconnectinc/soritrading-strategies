/*
 * @coinsori-strategy v1
 * name: Bollinger Band + RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: Combines Bollinger Bands and RSI to identify mean-reverting opportunities in trending markets. The strategy looks for overbought/oversold conditions with RSI while using Bollinger Bands as a filter for volatility.
 * When it buys and sells: Buys when price touches the lower Bollinger Band and RSI is below 30 (oversold), and sells when price touches the upper Bollinger Band and RSI is above 70 (overbought).
 * When it does NOT work: This strategy may fail during strong trending markets where price remains consistently near the upper or lower Bollinger Bands without reversing. It also underperforms in low-volatility environments.
 */

function onUpdate(ctx) {
  // Get required indicators
  const bb = ctx.bb(20, 2); // 20-period BB with 2 standard deviations
  const rsi = ctx.rsi(14);  // 14-period RSI
  
  if (bb == null || rsi == null) return null;
  
  // Get current price
  const price = ctx.price;
  
  // Check for oversold condition with Bollinger Band touch
  if (price <= bb.lower && rsi < 30) {
    // Buy when price touches lower BB and RSI is oversold
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  
  // Check for overbought condition with Bollinger Band touch
  if (price >= bb.upper && rsi > 70) {
    // Sell when price touches upper BB and RSI is overbought
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
