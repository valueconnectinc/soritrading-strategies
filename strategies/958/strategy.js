/*
 * @coinsori-strategy v1
 * name: RSI-based Mean Reversion Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses the Relative Strength Index (RSI) to identify overbought and oversold conditions.
 * When RSI crosses below 30 (oversold), it's a buy signal.
 * When RSI crosses above 70 (overbought), it's a sell signal.
 * It aims to capitalize on mean reversion in price movements.
 */

function onUpdate(ctx) {
  // Get the RSI value
  const rsi = ctx.rsi(14);                    // 14-period RSI
  
  // Check if we have enough data to calculate RSI
  if (rsi == null) return null;
  
  // Check if we are currently holding a position
  const hasPosition = ctx.position > 0;
  
  // Buy condition: RSI crosses below 30 (oversold)
  if (!hasPosition && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: RSI crosses above 70 (overbought)
  if (hasPosition && rsi > 70) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // Do nothing if conditions are not met
  return null;
}
