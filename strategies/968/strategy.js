/*
 * @coinsori-strategy v1
 * name: RSI-Based Trend Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses RSI to determine if the market is overbought or oversold, and filters trades based on a trend using a moving average. It avoids trades during strong trends and only enters trades in a consolidation phase.
 * When it buys and sells: It buys when RSI is below 30 (oversold) and price is above the 50-period SMA, and sells when RSI is above 70 (overbought) and price is below the 50-period SMA.
 * When it does NOT work: This strategy might underperform in strong trending markets where price stays primarily above or below the moving average for prolonged periods, making it difficult to enter or exit trades effectively.
 */

function onUpdate(ctx) {
  // Define parameters
  const rsiLength = 14;
  const smaLength = 50;

  // Calculate RSI and SMA
  const rsi = ctx.rsi(rsiLength);
  const sma = ctx.sma(smaLength);

  if (rsi == null || sma == null) return null;

  // Determine trend based on price relative to the SMA
  const isBullishTrend = ctx.price > sma;
  const isBearishTrend = ctx.price < sma;

  // Entry conditions
  if (rsi < 30 && isBullishTrend && ctx.position === 0) {
    // Buy when RSI is oversold and in a bullish trend
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (rsi > 70 && isBearishTrend && ctx.position > 0) {
    // Sell when RSI is overbought and in a bearish trend
    return { side: 'sell', qty: ctx.position };
  }

  // Do nothing otherwise
  return null;
}
