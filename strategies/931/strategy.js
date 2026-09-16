/*
 * @coinsori-strategy v1
 * name: SMA Crossover Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: The strategy is based on the simple moving average (SMA) crossover technique. When a short-term SMA crosses above a long-term SMA, it generates a buy signal. Conversely, when the short-term SMA crosses below the long-term SMA, it generates a sell signal. This approach aims to capture trend-following opportunities.
 * When it buys and sells: It buys when the 10-period SMA crosses above the 30-period SMA and sells when the 10-period SMA crosses below the 30-period SMA. The strategy attempts to follow the direction of the market trend.
 * When it does NOT work: This strategy may fail in ranging markets where prices oscillate between support and resistance levels without a clear trend, causing frequent whipsaws or poor trade selection that leads to losses.
 */

function onUpdate(ctx) {
  const shortSMA = ctx.sma(10); // Short-term SMA with 10-period
  const longSMA = ctx.sma(30);  // Long-term SMA with 30-period
  
  if (shortSMA == null || longSMA == null) return null;

  // Check for buy signal: short SMA crosses above long SMA
  if (shortSMA > longSMA && ctx.sma(10, 1) <= ctx.sma(30, 1)) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Check for sell signal: short SMA crosses below long SMA
  if (shortSMA < longSMA && ctx.sma(10, 1) >= ctx.sma(30, 1)) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action
  return null;
}
