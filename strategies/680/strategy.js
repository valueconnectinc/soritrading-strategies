/*
 * @coinsori-strategy v1
 * name: Multi-Timeframe MACD with Volume Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy uses MACD signals from multiple timeframes (1h and 4h) to confirm trend direction, combined with a volume filter to avoid trading during low-liquidity periods. This aims to reduce false signals and improve the reliability of entries.
 * When it buys and sells: It buys when both 1h and 4h MACD crossovers are positive, and sells when the 1h MACD crosses below its signal line, while ensuring sufficient trading volume.
 * When it does NOT work: The strategy may fail during very low-volume periods or in choppy markets where MACD signals are frequent but unprofitable. It also assumes that trend direction confirmed by higher timeframe is reliable, which might not hold in very fast-moving or sideways markets.
 */

function onUpdate(ctx) {
  // Get MACD values for both timeframes
  const macd_1h = ctx.macd(12, 26, 9, 0);
  const macd_4h = ctx.macd(12, 26, 9, 1); // Using previous bar to get 4h MACD
  
  // Get volume values
  const vol = ctx.vol;
  
  // Get average volume over last 5 bars for filtering
  const avg_vol_5 = ctx.avgVol(5);
  
  // Check if all required values are available (wait for warm-up)
  if (macd_1h == null || macd_4h == null) return null;
  
  // Volume filter: only trade when current volume is above average of last 5 bars
  if (vol == null || avg_vol_5 == null || vol <= avg_vol_5 * 0.8) {
    return null; // Do not trade if volume is too low
  }

  // Buy condition: MACD crossover on both timeframes (positive)
  if (macd_1h.macd > macd_1h.signal && macd_4h.macd > macd_4h.signal) {
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.95
    };
  }

  // Sell condition: MACD crossover on 1h timeframe crossed below signal line (negative)
  if (macd_1h.macd <= macd_1h.signal && macd_1h.macd > macd_1h.signal) {
    return {
      side: 'sell',
      qty: ctx.position
    };
  }

  // Do nothing otherwise
  return null;
}
