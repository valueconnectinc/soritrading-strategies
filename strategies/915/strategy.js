/*
 * @coinsori-strategy v1
 * name: BB_RSI_Mean_Reversion_Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines Bollinger Band and RSI to identify mean reversion opportunities. The Bollinger Band is used to detect when the price is at extreme levels, and the RSI adds a momentum filter to avoid trades in strong trends.
 * When it buys and sells: It buys when the price touches the lower Bollinger Band and RSI is below 30 (oversold), and sells when price touches the upper Bollinger Band and RSI is above 70 (overbought).
 * When it does NOT work: This strategy may fail in strong trending markets where prices do not revert to the mean, leading to frequent whipsaws.
 */

function onUpdate(ctx) {
  // Get indicators
  const bb = ctx.bb(20, 2); // Bollinger Bands with 20-period SMA and 2 std dev
  const rsi = ctx.rsi(14);

  // Guard against null values
  if (bb == null || rsi == null) return null;

  const lowerBand = bb.lower;
  const upperBand = bb.upper;
  const middleBand = bb.middle;

  // Check if we are in a position to trade
  if (ctx.position === 0) {
    // Buy condition: price touches lower BB and RSI is below 30 (oversold)
    if (ctx.price <= lowerBand && rsi < 30) {
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  } else {
    // Sell condition: price touches upper BB and RSI is above 70 (overbought)
    if (ctx.price >= upperBand && rsi > 70) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  // No trade
  return null;
}
