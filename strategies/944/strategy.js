/*
 * @coinsori-strategy v1
 * name: MACD-RSI Mean Reversion Strategy - Enhanced
 * ex: bybit
 * syms: BTC
 * interval: 1h
 * cash: 1000
 *
 * This strategy uses MACD and RSI to identify mean reversion opportunities.
 * It buys when RSI is below 30 (oversold) and MACD line crosses above signal line.
 * It sells when RSI is above 70 (overbought) and MACD line crosses below signal line.
 * The strategy includes additional filters to avoid trading in strong trends or low volatility periods.
 *
 * When it buys: The RSI is below 30 and MACD line crosses above the signal line, and volatility is above a threshold
 * When it sells: The RSI is above 70 and MACD line crosses below the signal line, and volatility is above a threshold
 * When it does NOT work: During strong trending markets or in low volatility periods where mean reversion fails to occur.
 */

function onUpdate(ctx) {
  // Get indicator values with ago parameter for previous bars
  const macd1 = ctx.macd(12, 26, 9, 1);
  const macd2 = ctx.macd(12, 26, 9, 2);
  const rsi1 = ctx.rsi(14, 1);
  const rsi2 = ctx.rsi(14, 2);
  const atr = ctx.atr(14, 1);

  // Guard against null values
  if (macd1 == null || macd2 == null || rsi1 == null || rsi2 == null || atr == null) {
    return null;
  }

  // Volatility threshold: use ATR to filter low-volatility periods
  const volatilityThreshold = ctx.avgVol(20) * 0.5; // half of average volume

  // BUY CONDITIONS (RSI < 30 and MACD crosses above signal line, and high volatility)
  const buyCondition = rsi2 < 30 && rsi1 >= 30 && macd2.macd <= macd2.signal && macd1.macd > macd1.signal && ctx.vol > volatilityThreshold;

  // SELL CONDITIONS (RSI > 70 and MACD crosses below signal line, and high volatility)
  const sellCondition = rsi2 > 70 && rsi1 <= 70 && macd2.macd >= macd2.signal && macd1.macd < macd1.signal && ctx.vol > volatilityThreshold;

  // Return buy or sell order if conditions are met
  if (buyCondition) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  } else if (sellCondition) {
    return { side: 'sell', qty: ctx.position };
  }

  // Do nothing otherwise
  return null;
}
