/*
 * @coinsori-strategy v1
 * name: Simple Moving Average Crossover
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses two moving averages - a short-term (fast) and a long-term (slow) - to generate buy/sell signals. When the fast MA crosses above the slow MA, it indicates an upward trend and a buy signal; conversely, when it crosses below, it suggests a downtrend and a sell signal.
 * When it buys and sells: It buys when the 10-period SMA crosses above the 30-period SMA and sells when the 10-period SMA crosses below the 30-period SMA.
 * When it does NOT work: This strategy may fail during sideways or choppy markets where there is no clear trend, leading to frequent whipsaws and losses.
 */

function onUpdate(ctx) {
  // Moving average parameters
  const fastLength = 10;
  const slowLength = 30;
  
  // Get moving average values
  const fastMA = ctx.sma(fastLength, 0);
  const slowMA = ctx.sma(slowLength, 0);
  
  if (fastMA == null || slowMA == null) return null;

  // Previous bar values
  const fastMAPrev = ctx.sma(fastLength, 1);
  const slowMAPrev = ctx.sma(slowLength, 1);
  
  if (fastMAPrev == null || slowMAPrev == null) return null;
  
  // Check for crossover signals
  // Buy when fast MA crosses above slow MA
  if (fastMAPrev <= slowMAPrev && fastMA > slowMA) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell when fast MA crosses below slow MA
  if (fastMAPrev >= slowMAPrev && fastMA < slowMA) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
