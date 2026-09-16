/*
 * @coinsori-strategy v1
 * name: MACD RSI Hybrid Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy combines MACD and RSI indicators to identify mean reversion opportunities in BTCUSDT. MACD helps detect trend shifts while RSI identifies overbought/oversold conditions, improving signal quality.
 * When it buys and sells: It buys when MACD crosses above its signal line and RSI is under 30 (oversold), and sells when MACD crosses below its signal line and RSI is over 70 (overbought).
 * When it does NOT work: This strategy may fail during strong trending markets where mean reversion signals conflict with trend direction, or in low volatility conditions where both indicators are unreliable.
 */
function onUpdate(ctx) {
  // Get indicators
  const macd = ctx.macd(12, 26, 9, 0);
  const macd_1 = ctx.macd(12, 26, 9, 1);
  const rsi = ctx.rsi(14, 0);
  const rsi_1 = ctx.rsi(14, 1);

  // Check for valid data
  if (macd == null || macd_1 == null || rsi == null || rsi_1 == null) {
    return null;
  }

  // Buy condition: MACD crosses above signal line and RSI is under 30 (oversold)
  const buyCondition = (macd_1.macd <= macd_1.signal && macd.macd > macd.signal) && rsi < 30;

  // Sell condition: MACD crosses below signal line and RSI is over 70 (overbought)
  const sellCondition = (macd_1.macd >= macd_1.signal && macd.macd < macd.signal) && rsi > 70;

  // Execute trades
  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (sellCondition) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
