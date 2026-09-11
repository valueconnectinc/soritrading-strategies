/*
 * @coinsori-strategy v1
 * name: MACD Momentum Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy is based on the MACD indicator to capture momentum shifts in the market. It aims to enter long positions when the MACD line crosses above the signal line, indicating bullish momentum, and exit when it crosses below, signaling bearish momentum.
 * When it buys and sells: It buys when the MACD line crosses above the signal line and sells when it crosses below.
 * When it does NOT work: The strategy may not perform well in a sideways or range-bound market where there are few clear momentum shifts.
 */

function onUpdate(ctx) {
  // Get MACD values
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  
  // Guard against null values
  if (macd == null || macdPrev == null) {
    return null;
  }

  // Check for MACD crossover - buy when MACD line crosses above signal line
  if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal) {
    // Buy with 99% of available cash
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Check for MACD crossover - sell when MACD line crosses below signal line
  if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal) {
    // Sell entire position
    return { side: 'sell', qty: ctx.position };
  }

  // No action if no crossover
  return null;
}
