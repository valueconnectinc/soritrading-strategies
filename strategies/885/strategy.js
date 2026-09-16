/*
 * @coinsori-strategy v1
 * name: Bollinger Band Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy exploits mean reversion around Bollinger Band boundaries. When price touches the lower band, it's considered oversold and a buy signal is generated; when it touches the upper band, it's considered overbought and a sell signal is generated.
 * When it buys and sells: The strategy buys when the price touches the lower Bollinger Band and sells when it touches the upper Bollinger Band.
 * When it does NOT work: This strategy may fail in strong trending markets where price moves far away from the moving average for extended periods, causing frequent whipsaws and losses.
 */

function onUpdate(ctx) {
  // Get Bollinger Band values
  const bb = ctx.bb(20, 2); // 20-period BB with 2 standard deviations
  if (bb == null) return null;

  const upper = bb.upper;
  const middle = bb.middle;
  const lower = bb.lower;

  // Get current price
  const price = ctx.price;

  // Check for entry conditions
  if (price <= lower) {
    // Price touches or goes below the lower band -> buy signal
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (price >= upper) {
    // Price touches or goes above the upper band -> sell signal
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
