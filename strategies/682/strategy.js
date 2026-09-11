/*
 * @coinsori-strategy v1
 * name: Mean Reversion Strategy with Bollinger Bands
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy utilizes Bollinger Bands to identify overbought and oversold conditions for mean reversion trading. It buys when the price touches the lower band and sells when it touches the upper band.
 * When it buys and sells: It buys when the price touches the lower Bollinger Band and sells when it touches the upper Bollinger Band.
 * When it does NOT work: This strategy may fail in strong trending markets where prices do not revert to the mean. It can also underperform during periods of low volatility or high uncertainty where band widths are too narrow or too wide.
 */
function onUpdate(ctx) {
  // Get Bollinger Band values
  const bb = ctx.bb(20, 2, 0);
  const price = ctx.price;

  // Check for valid Bollinger Band values
  if (bb == null || bb.lower == null || bb.upper == null) {
    return null;
  }

  // Buy condition: price touches the lower band
  const buyCondition = (price <= bb.lower);

  // Sell condition: price touches the upper band
  const sellCondition = (price >= bb.upper);

  // Execute buy or sell orders based on conditions
  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (sellCondition) {
    return { side: 'sell', qty: ctx.position };
  }

  // Return null if no condition is met
  return null;
}
