/*
 * @coinsori-strategy v1
 * name: RSI-based Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the Relative Strength Index (RSI) to identify overbought and oversold conditions.
 * When RSI is below 30, it indicates an oversold condition and a potential buying opportunity.
 * When RSI is above 70, it indicates an overbought condition and a potential selling opportunity.
 *
 * When it buys and sells: It buys when RSI drops below 30 and sells when RSI rises above 70.
 *
 * When it does NOT work: This strategy may not perform well during strong trends where the asset remains 
 * in oversold or overbought conditions for extended periods. It also does not account for fundamental news or events.
 */
function onUpdate(ctx) {
  // Get RSI values
  const rsi = ctx.rsi(14);
  if (rsi == null) return null;
  
  // Define thresholds for buying and selling based on RSI
  // Buy when RSI is below 30 (oversold)
  const buyThreshold = 30;
  // Sell when RSI is above 70 (overbought)
  const sellThreshold = 70;
  
  // Check if we are currently in a position
  const position = ctx.position;
  
  // Buy signal: RSI is below buy threshold and no position
  if (rsi < buyThreshold && position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell signal: RSI is above sell threshold and we have a position
  if (rsi > sellThreshold && position > 0) {
    return { side: 'sell', qty: position };
  }
  
  // No action
  return null;
}
