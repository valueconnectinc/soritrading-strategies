/*
 * @coinsori-strategy v1
 * name: MACD RSI Combined Signal Strategy
 * ex: binance
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * This strategy combines MACD and RSI signals to identify strong buying opportunities.
 * It uses a custom MACD condition (MACD line crossing above signal line) alongside RSI filtering
 * to avoid entering trades during overbought or oversold periods. The strategy is designed to be
 * robust in both trending and ranging markets.
 *
 * When it buys: It enters long when the MACD crosses above its signal line AND RSI is below 60 (not overbought).
 * When it sells: It exits long positions when the MACD crosses below its signal line OR RSI exceeds 40 (not oversold).
 * When it does NOT work: The strategy may underperform in very choppy markets where both signals are unreliable, or when
 * there are strong directional moves that cause RSI to remain in extreme ranges.
 */

function onUpdate(ctx) {
  // --- Get indicators ---
  const macd = ctx.macd(12, 26, 9, 0);
  const macd_prev = ctx.macd(12, 26, 9, 1);
  const rsi = ctx.rsi(14, 0);
  const rsi_prev = ctx.rsi(14, 1);

  // --- Guard against null values ---
  if (macd == null || macd_prev == null || rsi == null || rsi_prev == null) {
    return null;
  }

  // --- Define entry conditions: MACD cross + RSI filter ---
  // Buy when MACD line crosses above signal line AND RSI is not overbought (>60)
  const buyCondition = (macd_prev.macd <= macd_prev.signal) && (macd.macd > macd.signal) && (rsi < 60);
  // Sell when MACD line crosses below signal line OR RSI is oversold (<40)
  const sellCondition = (macd_prev.macd >= macd_prev.signal) && (macd.macd < macd.signal) || (rsi > 40);

  // --- Entry logic ---
  if (buyCondition && ctx.position === 0) {
    // Buy with 99% of cash
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // --- Exit logic ---
  if (sellCondition && ctx.position > 0) {
    // Close existing position
    return { side: 'sell', qty: ctx.position };
  }

  // --- No action ---
  return null;
}
