/*
 * @coinsori-strategy v1
 * name: MACD Momentum Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy aims to capture momentum trends using MACD indicators with strict filters, avoiding false signals from mean reversion approaches.
 * When it buys and sells: The strategy buys when MACD line crosses above signal line and is above zero, and sells when the MACD line crosses below the signal line and is below zero.
 * When it does NOT work: This strategy may underperform during range-bound markets where momentum is weak or inconsistent.
 */

function onUpdate(ctx) {
  // Get MACD values with 1-bar lag (ago=1) for crossover detection
  const macd = ctx.macd(12, 26, 9, 1);
  const macdPrev = ctx.macd(12, 26, 9, 2);

  // Check if indicators are valid (not null)
  if (!macd || !macdPrev || macd.signal === undefined || macdPrev.signal === undefined) {
    return null;
  }

  // BUY condition: MACD line crosses above signal line and is positive
  if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal && macd.macd > 0) {
    ctx.log("BUY condition met");
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL condition: MACD line crosses below signal line and is negative
  if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal && macd.macd < 0) {
    ctx.log("SELL condition met");
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
