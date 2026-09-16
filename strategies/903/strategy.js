/*
 * @coinsori-strategy v1
 * name: MACD Trend Filter Mean Reversion
 * ex: binanceusdm
 * syms: ETHUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy uses a MACD trend filter to confirm the direction of the market and applies mean reversion logic within that trend. It aims to take positions when price pulls back from a recent high or low, confirming trend continuation via MACD.
 * When it buys and sells: It buys when MACD shows bullish signal (macd above signal) and price is near the lower band of Bollinger Bands, and sells when it shows bearish signal and price is near the upper band.
 * When it does NOT work: This strategy may fail during strong trends or in choppy markets where mean reversion logic doesn't apply.
 */

function onUpdate(ctx) {
  // Calculate MACD
  const macdLine = ctx.macd(12, 26, 9, 0);
  const signalLine = ctx.macd(12, 26, 9, 0)?.signal;
  
  // Check if we have enough data for MACD indicators
  if (macdLine == null || signalLine == null) return null;

  // Calculate Bollinger Bands
  const bb = ctx.bb(20, 2, 0);
  if (bb == null) return null;
  
  // Current price and position
  const price = ctx.price;
  const position = ctx.position;
  
  // Define trend based on MACD: bullish if macd > signal
  const isBullish = macdLine.macd > signalLine;

  // Get recent high and low for mean reversion logic
  const high = ctx.high(20, 0);
  const low = ctx.low(20, 0);
  if (high == null || low == null) return null;
  
  // Define thresholds for mean reversion
  const range = high - low;
  const upperThreshold = high - (range * 0.2); // 20% from the top
  const lowerThreshold = low + (range * 0.2);  // 20% from the bottom
  
  // When position is zero, look for entry signals
  if (position === 0) {
    // Entry for long: bullish trend and price near lower band
    if (isBullish && price <= bb.lower) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    
    // Entry for short: bearish trend and price near upper band
    if (!isBullish && price >= bb.upper) {
      return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 };
    }
  } else if (position > 0) {
    // For long position, exit if price crosses above upper threshold or MACD turns bearish
    if (price >= upperThreshold || !isBullish) {
      return { side: 'sell', qty: position }; // Close long position
    }
  } else if (position < 0) {
    // For short position, exit if price crosses below lower threshold or MACD turns bullish
    if (price <= lowerThreshold || isBullish) {
      return { side: 'buy', qty: Math.abs(position) }; // Close short position
    }
  }

  return null; // Do nothing
}
