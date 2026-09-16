/*
 * @coinsori-strategy v1
 * name: Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy is based on mean reversion theory which assumes that asset prices tend to return to their average levels over time. It's particularly effective in ranging markets.
 * When it buys and sells: The strategy buys when the price is significantly below the moving average, indicating overselling, and sells when it is significantly above the moving average, indicating overbought conditions.
 * When it does NOT work: In strong trending markets where prices continue to move in one direction for extended periods, this strategy may generate false signals and result in losses.
 */

function onUpdate(ctx) {
  const period = 20; // SMA period
  const devMultiplier = 2; // Standard deviation multiplier for BB bands

  // Get the moving average and Bollinger Bands
  const sma = ctx.sma(period);
  const bb = ctx.bb(period, devMultiplier);

  if (sma == null || bb == null || bb.upper == null || bb.lower == null) {
    return null;
  }

  // Calculate the current price relative to the moving average and Bollinger Bands
  const price = ctx.price;
  const upperBand = bb.upper;
  const lowerBand = bb.lower;

  // Check if price is below the lower band (oversold condition)
  if (price < lowerBand) {
    // Buy signal when price drops below the lower band
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Check if price is above the upper band (overbought condition)
  if (price > upperBand) {
    // Sell signal when price goes above the upper band
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
