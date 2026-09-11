/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the Relative Strength Index (RSI) to identify overbought and oversold conditions in the market. When the RSI crosses above the upper threshold (70), it indicates an overbought condition, signaling a potential sell opportunity. When it crosses below the lower threshold (30), it signals an oversold condition, indicating a potential buy opportunity.
 * When it buys and sells: It buys when the RSI crosses below 30 (oversold) and sells when it crosses above 70 (overbought).
 * When it does NOT work: This strategy may not work well in strong trending markets where prices remain far from overbought or oversold levels for extended periods.
 */
function onUpdate(ctx) {
  // Get RSI value
  const rsi = ctx.rsi(14, 0);
  
  // Check if RSI is available
  if (rsi == null) {
    return null;
  }
  
  // Buy when RSI crosses below 30 (oversold)
  const rsi_prev = ctx.rsi(14, 1);
  if (rsi_prev == null) {
    return null;
  }
  
  if (rsi_prev >= 30 && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell when RSI crosses above 70 (overbought)
  if (rsi_prev <= 70 && rsi > 70) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // Do nothing otherwise
  return null;
}
