/*
 * @coinsori-strategy v1
 * name: Funding Rate Sentiment Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses funding rate trends to identify when the market is likely to move in a certain direction. When the funding rate is consistently negative (indicating longs are paying shorts), it suggests a bearish sentiment, and vice versa for bullish.
 * When it buys and sells: It enters long positions when funding rates are positive and show an increasing trend, and short positions when funding rates are negative and show a decreasing trend. It exits positions based on profit targets or stop losses.
 * When it does NOT work: The strategy may fail during periods of low volatility or in markets where funding rates do not accurately reflect market sentiment.
 */

function onUpdate(ctx) {
  // Get the last 5 funding rate values
  const fundingRates = [];
  for (let i = 0; i < 5; i++) {
    const fr = ctx.data('fundingRate');
    if (fr == null || fr.length < 1) return null;
    fundingRates.push(fr[fr.length - 1 - i]);
  }

  // Calculate the average of recent funding rates
  let avgFunding = 0;
  for (let i = 0; i < fundingRates.length; i++) {
    avgFunding += fundingRates[i];
  }
  avgFunding /= fundingRates.length;

  // Get the trend of the last few funding rate values
  const recentTrend = fundingRates[fundingRates.length - 1] > fundingRates[0];

  // Check if we are in a long position
  const isInLong = ctx.position > 0;
  const isInShort = ctx.position < 0;

  // Calculate stop loss and take profit levels based on ATR
  const atr = ctx.atr(14);
  if (atr == null) return null;
  
  const stopLossDistance = atr * 1.5; // 1.5x ATR for stop loss
  const takeProfitDistance = atr * 2; // 2x ATR for take profit
  
  // Exit position if stop loss or take profit is hit
  if (isInLong || isInShort) {
    if (isInLong && ctx.price <= ctx.entryPx - stopLossDistance) {
      return { side: 'sell', qty: ctx.position };
    }
    if (isInShort && ctx.price >= ctx.entryPx + stopLossDistance) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
    if (isInLong && ctx.price >= ctx.entryPx + takeProfitDistance) {
      return { side: 'sell', qty: ctx.position };
    }
    if (isInShort && ctx.price <= ctx.entryPx - takeProfitDistance) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
  }

  // Entry conditions
  let order = null;
  
  // Buy condition: positive average funding rate with increasing trend
  if (avgFunding > 0 && recentTrend) {
    if (!isInLong && !isInShort) {
      order = { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
  }
  
  // Sell condition: negative average funding rate with decreasing trend
  if (avgFunding < 0 && !recentTrend) {
    if (!isInLong && !isInShort) {
      order = { side: 'sell', qty: ctx.cash / ctx.price * 0.99 };
    }
  }

  return order;
}
