/*
 * @coinsori-strategy v1
 * name: Enhanced Bollinger Band Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This enhanced strategy adds a volume filter to the basic Bollinger Band mean reversion approach. It aims to reduce false signals by only entering trades when volume is above average, filtering out low-liquidity periods that can lead to whipsaw patterns.
 * When it buys and sells: The strategy enters a buy position when price touches the lower Bollinger Band AND volume is above the 20-period average volume. It exits the position when price reaches the upper Bollinger Band.
 * When it does NOT work: This strategy may fail in markets with consistently low volume, or during strong trending periods where the added volume filter prevents the strategy from entering trades at optimal times.
 */

function onUpdate(ctx) {
  // Get Bollinger Band values
  const bb = ctx.bb(20, 2); // 20-period BB with 2 standard deviations
  if (bb == null) return null;

  const upper = bb.upper;
  const middle = bb.middle;
  const lower = bb.lower;

  // Get current price and volume
  const price = ctx.price;
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20); // 20-period average volume

  // Check for entry conditions
  if (price <= lower && vol > avgVol) {
    // Price touches or goes below the lower band and volume is above average -> buy signal
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (price >= upper) {
    // Price touches or goes above the upper band -> sell signal
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
