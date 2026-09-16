/*
 * @coinsori-strategy v1
 * name: MACD Crossover Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The MACD crossover is a widely used momentum indicator that helps identify potential buy and sell signals based on the convergence/divergence of two moving averages.
 * When it buys and sells: This strategy buys when the MACD line crosses above the signal line, and sells when the MACD line crosses below the signal line.
 * When it does NOT work: This strategy may not perform well in ranging or choppy markets where there are frequent false signals from the MACD crossover.
 */

function onUpdate(ctx) {
  // Get MACD values with ago parameters for previous bars
  const macd = ctx.macd(12, 26, 9, 1);
  const signal = ctx.macd(12, 26, 9, 2);
  
  // Check if previous MACD and signal values are not null
  if (macd == null || signal == null) return null;
  
  // Check for crossover condition to buy
  if (macd.macd <= signal.macd && macd.signal < signal.signal) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  // Check for crossover condition to sell
  else if (macd.macd >= signal.macd && macd.signal > signal.signal) {
    return { side: 'sell', qty: ctx.position };
  }
  
  // No trade action needed
  return null;
}
