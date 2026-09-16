/*
 * @coinsori-strategy v1
 * name: Simple Moving Average Crossover Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses a simple moving average crossover to identify trend changes in Bitcoin. It's designed to capture long-term trends by entering positions when a short-term SMA crosses above a long-term SMA.
 * When it buys and sells: The strategy buys when a 10-period SMA crosses above a 50-period SMA, and sells when the 10-period SMA crosses below the 50-period SMA. These crossovers indicate potential trend changes in price behavior.
 * When it does NOT work: This strategy may fail during ranging market conditions where there are no clear trends, leading to frequent whipsaws and potential losses. It also doesn't account for volatility or volume filtering which could help reduce noise in the signals.
 */
function onUpdate(ctx) {
  // Calculate SMAs
  const sma10 = ctx.sma(10, 0);
  const sma50 = ctx.sma(50, 0);
  
  // Previous SMAs for crossover detection
  const sma10_1 = ctx.sma(10, 1);
  const sma50_1 = ctx.sma(50, 1);
  
  // Guard against null values
  if (sma10 == null || sma50 == null || sma10_1 == null || sma50_1 == null) {
    return null;
  }
  
  // Buy condition: 10-period SMA crosses above 50-period SMA
  if (sma10_1 <= sma50_1 && sma10 > sma50) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: 10-period SMA crosses below 50-period SMA
  if (sma10_1 >= sma50_1 && sma10 < sma50) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
