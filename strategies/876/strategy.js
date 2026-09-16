/*
 * @coinsori-strategy v1
 * name: MACD Crossover Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses the MACD (Moving Average Convergence Divergence) indicator to generate buy and sell signals.
 * When the MACD line crosses above the signal line, it's considered a bullish crossover — a buy signal.
 * When the MACD line crosses below the signal line, it's considered a bearish crossover — a sell signal.
 *
 * The strategy aims to capture trend changes in the market using the MACD indicator.
 * It buys when MACD crosses above the signal line and sells when it crosses below.
 * 
 * This approach works best in trending markets where MACD can identify the beginning or end of trends.
 * The strategy does not work well during ranging markets where price fluctuates without a clear direction.
 */

function onUpdate(ctx) {
  // Get MACD values (12, 26, 9)
  const macd = ctx.macd(12, 26, 9, 0);     // Current MACD
  const macdPrev = ctx.macd(12, 26, 9, 1); // Previous MACD
  
  // Guard against null values (warm-up period)
  if (macd == null || macdPrev == null) return null;
  
  // Check for crossover conditions
  // If previous MACD was below signal line and current MACD is above signal line — bullish crossover
  if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal) {
    // Buy condition: MACD crossed above signal line
    return { 
      side: 'buy', 
      qty: ctx.cash / ctx.price * 0.99 
    };
  }
  
  // If previous MACD was above signal line and current MACD is below signal line — bearish crossover
  if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal) {
    // Sell condition: MACD crossed below signal line
    return { 
      side: 'sell', 
      qty: ctx.position 
    };
  }

  // No action needed
  return null;
}
