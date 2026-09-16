/*
 * @coinsori-strategy v1
 * name: RSI + ATR Volatility Filter Strategy Improved
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This improved strategy incorporates both RSI and ATR to filter out low-volatility periods, enhancing entry accuracy and reducing false signals.
 * When it buys and sells: The strategy buys when RSI crosses above a threshold and ATR is above its average, and sells when RSI crosses below the threshold and ATR is above its average.
 * When it does NOT work: This strategy may underperform during periods of very low volatility or high correlation with macroeconomic factors that are not captured in this model.
 */

function onUpdate(ctx) {
  // Get RSI and ATR values with 1-bar lag (ago=1) for crossover detection
  const rsi = ctx.rsi(14, 1);
  const atr = ctx.atr(14, 1);
  const atrPrev = ctx.atr(14, 2);

  // Calculate average ATR over the last 10 bars as a volatility threshold
  let avgAtr = 0;
  for (let i = 0; i < 10; i++) {
    const atrVal = ctx.atr(14, i);
    if (atrVal === null) return null; // Wait for enough data
    avgAtr += atrVal;
  }
  avgAtr /= 10;

  // Check if indicators are valid (not null)
  if (!rsi || !atr || !atrPrev) {
    return null;
  }

  // BUY condition: RSI crosses above 30 and ATR is above average
  if (rsi < 30 && ctx.rsi(14, 2) >= 30 && atr > avgAtr) {
    ctx.log("BUY condition met with RSI crossing over 30 and high volatility");
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL condition: RSI crosses below 70 and ATR is above average
  if (rsi > 70 && ctx.rsi(14, 2) <= 70 && atr > avgAtr) {
    ctx.log("SELL condition met with RSI crossing below 70 and high volatility");
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
