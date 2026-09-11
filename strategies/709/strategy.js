/*
 * @coinsori-strategy v1
 * name: Mean Reversion with ATR and Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy exploits short-term mean reversion opportunities in Bitcoin, using ATR to gauge volatility and volume to confirm the strength of a move. It looks for price dips below a moving average after a strong upward move with high volume, indicating a potential reversal.
 * When it buys and sells: It buys when price dips below a moving average (e.g. 20-period SMA) after a significant upward move with high volume, signaling the trend may be losing momentum. It sells when price rebounds above the moving average, confirming the mean reversion.
 * When it does NOT work: This strategy can fail in strong trending markets where prices keep moving in one direction, and in low-volume periods where there is insufficient confirmation of a reversal.
 */
function onUpdate(ctx) {
  // === INDICATORS ===
  const sma20 = ctx.sma(20);
  const atr14 = ctx.atr(14);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const close = ctx.price;
  
  // === GUARDS ===
  if (sma20 == null || atr14 == null || vol == null || avgVol == null) return null;
  
  // === CONDITIONS ===
  // Check if volume is greater than average volume (to confirm strength of a move)
  const volumeConfirmed = vol > avgVol * 1.2;
  
  // Check if price is below the moving average (indicating a dip)
  const belowSMA = close < sma20;
  
  // Check if ATR is relatively low (suggesting low volatility, so price move could be a good candidate for mean reversion)
  const lowVolatility = atr14 < ctx.atr(14, 1); // Compare current with previous ATR
  
  // If volume is confirmed and price is below the moving average, and volatility is low — it's a buy signal
  if (volumeConfirmed && belowSMA && lowVolatility) {
    return { 
      side: 'buy', 
      qty: ctx.cash / close * 0.95 
    };
  }
  
  // If position exists and price is above the moving average — it's a sell signal
  if (ctx.position > 0 && close > sma20) {
    return { 
      side: 'sell', 
      qty: ctx.position 
    };
  }
  
  return null;
}
