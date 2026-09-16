/*
 * @coinsori-strategy v1
 * name: MACD Trend Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy uses the MACD (Moving Average Convergence Divergence) indicator to filter trades based on trend direction. It enters long positions only when the MACD signal is above its value, indicating an uptrend, and exits when the trend turns bearish.
 * When it buys and sells: Buys when MACD line crosses above signal line (bullish crossover). Sells when MACD line crosses below signal line (bearish crossover).
 * When it does NOT work: This strategy may not perform well in ranging or flat markets where MACD signals are unreliable, leading to frequent whipsaws and losses.
 */

function onUpdate(ctx) {
  // Parameters for MACD
  const fastLength = 12;
  const slowLength = 26;
  const signalLength = 9;

  // Retrieve MACD values
  const macdLine = ctx.macd(fastLength, slowLength, signalLength);

  // Ensure sufficient data before making decisions
  if (macdLine == null || macdLine.signal == null) return null;

  // Check position status
  const pos = ctx.position;

  // Buy condition: MACD line crosses above signal line
  if (macdLine.macd > macdLine.signal && pos <= 0) {
    // Enter long position with 99% of available cash
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: MACD line crosses below signal line
  if (macdLine.macd < macdLine.signal && pos > 0) {
    // Close existing long position
    return { side: 'sell', qty: pos };
  }

  // No action
  return null;
}
