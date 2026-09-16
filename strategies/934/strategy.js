/*
 * @coinsori-strategy v1
 * name: Volume and RSI Filtered Moving Average Crossover Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines moving average crossover with volume and RSI filters to improve signal reliability. It aims to reduce false signals by ensuring that crossovers occur during high-volume periods and when RSI is not overbought or oversold.
 * When it buys and sells: The strategy enters a buy position when a 10-period SMA crosses above a 50-period SMA, the volume is higher than average, and the RSI is below 70. It sells when the 10-period SMA crosses below the 50-period SMA, volume is high, and RSI is above 30.
 * When it does NOT work: This strategy may fail in strongly trending markets where volume filters might prevent entries, or during low-volatility periods when volume thresholds are not met. It also doesn't account for changes in market regime or macro-level factors that could influence price movements.
 */
function onUpdate(ctx) {
  // Calculate SMAs
  const sma10 = ctx.sma(10, 0);
  const sma50 = ctx.sma(50, 0);
  
  // Previous SMAs for crossover detection
  const sma10_1 = ctx.sma(10, 1);
  const sma50_1 = ctx.sma(50, 1);
  
  // Calculate RSI
  const rsi = ctx.rsi(14, 0);
  
  // Calculate average volume over 20 periods
  const avgVol = ctx.avgVol(20);
  
  // Guard against null values
  if (sma10 == null || sma50 == null || sma10_1 == null || sma50_1 == null || rsi == null || avgVol == null) {
    return null;
  }
  
  // Buy condition: SMA crossover, high volume, RSI not overbought
  if (sma10_1 <= sma50_1 && sma10 > sma50 && ctx.vol > avgVol && rsi < 70) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Sell condition: SMA crossover, high volume, RSI not oversold
  if (sma10_1 >= sma50_1 && sma10 < sma50 && ctx.vol > avgVol && rsi > 30) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
