/*
 * @coinsori-strategy v1
 * name: Trend Following with RSI Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses a trend-following approach with an RSI filter to identify strong momentum moves and avoid whipsaws. It enters long positions when the price crosses above a 50-period SMA and RSI is above 50, indicating bullish momentum. It exits on the opposite conditions.
 * When it buys and sells: Buys when price crosses above 50-period SMA and RSI > 50. Sells when price crosses below 50-period SMA or RSI < 50.
 * When it does NOT work: When the market is ranging or lacks strong momentum, this strategy may generate frequent false signals and experience high transaction costs.
 */

function onUpdate(ctx) {
  // Calculate indicators
  const sma50 = ctx.sma(50);
  const rsi = ctx.rsi(14);
  
  // Guard against null values
  if (sma50 == null || rsi == null) return null;

  // Buy condition: Price crosses above SMA and RSI > 50
  if (ctx.price > sma50 && rsi > 50) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: Price crosses below SMA or RSI < 50
  if (ctx.price < sma50 || rsi < 50) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
