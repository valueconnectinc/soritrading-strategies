/*
 * @coinsori-strategy v1
 * name: MACD Momentum Filter Strategy Enhanced
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This enhanced strategy builds upon the previous MACD approach, with added filters to improve signal quality and reduce whipsaws.
 * When it buys and sells: The strategy buys when MACD line crosses above signal line and is positive, with additional filters on volume and price action.
 * When it does NOT work: This strategy may underperform during range-bound markets where momentum is weak or inconsistent, particularly in low-volume conditions.
 */

function onUpdate(ctx) {
  // Get MACD values with 1-bar lag (ago=1) for crossover detection
  const macd = ctx.macd(12, 26, 9, 1);
  const macdPrev = ctx.macd(12, 26, 9, 2);

  // Volume filter - only trade if volume is above average
  const avgVol = ctx.avgVol(10);
  if (avgVol === null || ctx.vol < avgVol) {
    return null;
  }

  // Price action filter - check if price is trending up or down
  const priceChange = ctx.change(1);
  if (priceChange === null) {
    return null;
  }

  // Check if indicators are valid (not null)
  if (!macd || !macdPrev || macd.signal === undefined || macdPrev.signal === undefined) {
    return null;
  }

  // BUY condition: MACD line crosses above signal line and is positive, volume and price trend are positive
  if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal && macd.macd > 0 && priceChange > 0) {
    ctx.log("BUY condition met with strong volume and positive price trend");
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL condition: MACD line crosses below signal line and is negative, volume and price trend are negative
  if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal && macd.macd < 0 && priceChange < 0) {
    ctx.log("SELL condition met with strong volume and negative price trend");
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
