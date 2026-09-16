/*
 * @coinsori-strategy v1
 * name: Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy is based on the concept of mean reversion in cryptocurrency markets. It assumes that price tends to return to its average level over time, and attempts to exploit short-term deviations from this average.
 * When it buys and sells: The strategy buys when the price deviates significantly below the moving average (indicating overselling) and sells when it deviates significantly above the average (indicating overbuying).
 * When it does NOT work: This strategy may not work in strongly trending markets where prices continue to move in one direction for an extended period, ignoring mean reversion.
 */

function onUpdate(ctx) {
  // Use a 20-period simple moving average
  const sma = ctx.sma(20);
  
  // Get the current price and the 20-period SMA
  const price = ctx.price;
  
  // Guard against null values
  if (sma == null) return null;

  // Calculate the percentage difference between price and SMA
  const diffPercent = (price - sma) / sma;

  // Buy when price is significantly below the SMA (e.g., -2%)
  if (diffPercent < -0.02) {
    // Return a buy order for 99% of available cash
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Sell when price is significantly above the SMA (e.g., +2%)
  if (diffPercent > 0.02) {
    // Return a sell order for the current position
    return { side: 'sell', qty: ctx.position };
  }

  // Do nothing otherwise
  return null;
}
