/*
 * @coinsori-strategy v1
 * name: Volume-Weighted Trend Following Strategy
 * ex: binanceusdm
 * syms: BTCUSDT ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy relies on volume-weighted trend following, focusing on both price momentum and trading volume to identify stronger trends. By incorporating volume data, it aims to filter out false breakouts or weak trends.
 * When it buys and sells: The strategy enters a long position when the price is above a 50-period SMA and volume is above its 20-period average. It exits the position when the price crosses below the SMA or volume drops significantly.
 * When it does NOT work: This strategy may underperform during sideways or low-volatility markets, where trends are not well-defined. Additionally, it might misinterpret trends during high-frequency market events, potentially leading to false signals.
 */
function onUpdate(ctx) {
  // Get volume and price data
  const vol = ctx.vol;
  const closes = ctx.closes;
  
  // Calculate averages
  const sma50 = ctx.sma(50, 0);
  const avgVol20 = ctx.avgVol(20);

  // Ensure values are valid
  if (vol == null || closes == null || sma50 == null || avgVol20 == null) return null;

  // Define conditions for entering long position
  const isPriceAboveSMA = ctx.price > sma50;
  const isVolumeAboveAverage = vol > avgVol20;
  
  // If we are in a long position, check if we should exit
  if (ctx.position > 0) {
    // Exit if price drops below SMA or volume falls significantly
    if (ctx.price < sma50 || vol < avgVol20 * 0.7) {
      return { side: 'sell', qty: ctx.position };
    }
  } else {
    // Enter long position only if both conditions are met
    if (isPriceAboveSMA && isVolumeAboveAverage) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
    }
  }

  // No action needed
  return null;
}
