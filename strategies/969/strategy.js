/*
 * @coinsori-strategy v1
 * name: MACD and RSI Trend Filter Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines MACD crossovers with an RSI trend filter to enter trades only when the overall momentum is in our favor. It aims to avoid trading against the trend and reduce false signals during ranging markets.
 * When it buys and sells: It buys when MACD line crosses above signal line (bullish crossover) AND RSI is above 50 (uptrend), it sells when MACD line crosses below signal line (bearish crossover) AND RSI is below 50 (downtrend).
 * When it does NOT work: The strategy fails in strongly trending markets where the RSI does not reflect the true trend direction, or when market conditions change quickly and the filters do not adapt fast enough.
 */

function onUpdate(ctx) {
  // Get MACD values
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);

  // Get RSI value
  const rsi = ctx.rsi(14, 0);

  // Guard against null values
  if (macd == null || macdPrev == null || rsi == null) return null;

  // Buy condition: MACD bullish crossover + RSI > 50 (uptrend)
  if (macdPrev.macd <= macdPrev.signal && macd.macd > macd.signal && rsi > 50) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition: MACD bearish crossover + RSI < 50 (downtrend)
  if (macdPrev.macd >= macdPrev.signal && macd.macd < macd.signal && rsi < 50) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action
  return null;
}
