/*
 * @coinsori-strategy v1
 * name: Mean Reversion with RSI
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy bets on the mean reversion of price after extreme RSI readings.
 * When it buys and sells: It buys when RSI crosses below 30 (oversold) and sells when RSI crosses above 70 (overbought).
 * When it does NOT work: It fails in strong trending markets where assets continue to move in one direction for extended periods.
 */

function onUpdate(ctx) {
  // Get the RSI indicator
  const rsi = ctx.rsi(14);

  // Guard against null values
  if (rsi == null) return null;

  // If we have no position and RSI is below 30, buy
  if (ctx.position === 0 && rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // If we have a position and RSI is above 70, sell
  if (ctx.position > 0 && rsi > 70) {
    return { side: 'sell', qty: ctx.position };
  }

  // Do nothing otherwise
  return null;
}
