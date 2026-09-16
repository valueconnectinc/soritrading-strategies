/*
 * @coinsori-strategy v1
 * name: BTC Bollinger Band Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses Bollinger Bands to identify overbought and oversold conditions for mean reversion trades. It aims to capture price movements when the price moves too far from the moving average, suggesting a potential reversal.
 * When it buys and sells: The strategy buys when the price touches or crosses the lower Bollinger Band (oversold condition) and sells when it touches or crosses the upper Bollinger Band (overbought condition).
 * When it does NOT work: This strategy may underperform during strong trending markets where prices remain in the overbought or oversold regions for extended periods. It might also generate false signals during low volatility periods.
 */

function onUpdate(ctx) {
  // Bollinger Band parameters
  const length = 20;
  const mult = 2;

  // Get Bollinger Band values
  const bb = ctx.bb(length, mult, 0);
  const bbPrev = ctx.bb(length, mult, 1); // Previous bar

  // Check if we have enough data for Bollinger Bands
  if (bb == null || bbPrev == null) return null;

  // Get the close prices
  const currentClose = ctx.price;
  const prevClose = ctx.closes[1];

  // Calculate price change
  const priceChange = (currentClose - prevClose) / prevClose;

  // Threshold for price movement
  const priceThreshold = 0.01; // 1% threshold for price movement

  // Buy condition: Price touches or crosses the lower Bollinger Band
  if (
    prevClose <= bbPrev.lower &&
    currentClose > bb.lower &&
    Math.abs(priceChange) >= priceThreshold
  ) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: Price touches or crosses the upper Bollinger Band
  if (
    prevClose >= bbPrev.upper &&
    currentClose < bb.upper &&
    Math.abs(priceChange) >= priceThreshold
  ) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
