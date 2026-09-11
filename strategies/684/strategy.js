/*
 * @coinsori-strategy v1
 * name: Average True Range Breakout Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy uses the Average True Range (ATR) to identify volatility and set breakout levels. It aims to capture significant price movements when the price breaks out of a defined range, indicating a potential trend change.
 * When it buys and sells: The strategy buys when price breaks above the upper band (based on ATR), and sells when price breaks below the lower band.
 * When it does NOT work: This strategy may underperform in low-volatility markets where breakouts are infrequent or during high volatility periods where the breakout signals can be misleading.
 */

function onUpdate(ctx) {
  // Get ATR value
  const atr = ctx.atr(14, 0);
  
  // Get current close price
  const close = ctx.price;
  
  // Get previous close price
  const prevClose = ctx.closes[1];
  
  // Check if all values are available
  if (atr == null || close == null || prevClose == null) return null;

  // Calculate upper and lower bands based on ATR
  const upperBand = prevClose + (2 * atr);
  const lowerBand = prevClose - (2 * atr);

  // Buy condition: price breaks above upper band
  const buyCondition = close > upperBand;
  
  // Sell condition: price breaks below lower band
  const sellCondition = close < lowerBand;

  // If position is zero, and buy condition is met, then buy
  if (ctx.position === 0 && buyCondition) {
    return {
      side: 'buy',
      qty: ctx.cash / ctx.price * 0.99
    };
  }
  
  // If position is greater than zero, and sell condition is met, then sell
  if (ctx.position > 0 && sellCondition) {
    return {
      side: 'sell',
      qty: ctx.position
    };
  }

  // No action needed
  return null;
}
