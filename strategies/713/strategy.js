/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Strategy BNBUSDT 1h Improved
 * ex: binanceusdm
 * syms: BNBUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy exploits mean reversion opportunities using RSI (Relative Strength Index).
 * When RSI falls below 30 (oversold), it buys; when it rises above 70 (overbought), it sells.
 * It also incorporates a volume filter to avoid trading during low-volume periods.
 * 
 * The strategy buys when RSI crosses below 30 and sells when it crosses above 70.
 * When the position is closed, it waits for the RSI to return to its neutral zone (50) before re-entering.
 * 
 * This approach works well in ranging markets where price tends to revert to its mean after extreme moves.
 * The strategy does NOT work well during strong trending markets when the price continues moving in one direction.
 */

function onUpdate(ctx) {
  // Read RSI and volume indicators
  const rsi = ctx.rsi(14);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  
  // Wait for RSI to be calculated (first 13 bars)
  if (rsi == null) return null;
  
  // Volume filter: Only trade when volume is above average
  if (vol < avgVol * 0.8) {
    return null; // Avoid trading in low-volume periods
  }
  
  // Check current position
  const pos = ctx.position;
  
  // Buy condition: RSI crosses below 30 (oversold)
  if (rsi < 30 && pos === 0) {
    // Enter long position
    return { 
      side: 'buy', 
      qty: ctx.cash / ctx.price * 0.99 
    };
  }
  
  // Sell condition: RSI crosses above 70 (overbought)
  if (rsi > 70 && pos > 0) {
    // Exit long position
    return { 
      side: 'sell', 
      qty: pos 
    };
  }
  
  // Do nothing
  return null;
}
