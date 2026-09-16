/*
 * @coinsori-strategy v1
 * name: MACD-RSI Trend Filter
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines MACD and RSI to filter trend entries. It aims to avoid trades during strong trends by using MACD for trend direction and RSI for overbought/oversold conditions.
 * When it buys and sells: It buys when the MACD line crosses above the signal line in a bullish trend (MACD > 0) AND RSI is below 30 (oversold). It sells when the MACD line crosses below the signal line in a bearish trend (MACD < 0) OR RSI exceeds 70 (overbought).
 * When it does NOT work: This strategy may fail during strong trends where RSI does not give reliable signals. In such cases, the strategy could miss out on large moves, or enter too early and exit too late.
 */
function onUpdate(ctx) {
  // Get indicators
  const macd = ctx.macd(12, 26, 9, 0);
  const macdPrev = ctx.macd(12, 26, 9, 1);
  const rsi = ctx.rsi(14, 0);
  const rsiPrev = ctx.rsi(14, 1);

  // Guard against null values
  if (macd == null || macdPrev == null || rsi == null || rsiPrev == null) {
    return null;
  }

  // Buy condition:
  // - MACD line crosses above signal line (bullish crossover)
  // - MACD is positive (uptrend)
  // - RSI is below 30 (oversold)
  if ((macd.macd > macd.signal) && (macdPrev.macd <= macdPrev.signal) && 
      (macd.macd > 0) && (rsi < 30)) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition:
  // - MACD line crosses below signal line (bearish crossover)
  // - MACD is negative (downtrend)
  // - OR RSI exceeds 70 (overbought)
  if ((macd.macd < macd.signal) && (macdPrev.macd >= macdPrev.signal) && 
      (macd.macd < 0)) {
    return { side: 'sell', qty: ctx.position };
  }

  // Exit if RSI is overbought
  if (rsi > 70) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
