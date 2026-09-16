/*
 * @coinsori-strategy v1
 * name: RSI + ATR Volatility Filter Mean Reversion
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses RSI and ATR to filter mean reversion trades.
 * It enters when RSI shows oversold/overbought conditions but only if the volatility (ATR) 
 * is above a certain threshold, to avoid entering during low-volatility periods where
 * mean reversion might not be effective.
 * When it buys and sells: Buys when RSI < 30 (oversold) and ATR > threshold. Sells when RSI > 70 (overbought).
 * When it does NOT work: This strategy may fail in trending markets where mean reversion is less effective,
 * or if the volatility filter is too strict, preventing any trades.
 */

function onUpdate(ctx) {
  // Parameters
  const rsiLength = 14;
  const atrLength = 14;
  const volatilityThreshold = 30; // ATR threshold to determine high volatility
  
  // Indicators
  const rsi = ctx.rsi(rsiLength, 0);
  const rsi_prev = ctx.rsi(rsiLength, 1);
  
  const atr = ctx.atr(atrLength, 0);
  const atr_prev = ctx.atr(atrLength, 1);

  // Guard against null values
  if (!rsi || !rsi_prev || !atr || !atr_prev) {
    return null;
  }

  // Volatility condition: ATR must be above threshold to consider trade
  const isHighVolatility = atr > volatilityThreshold;

  // RSI conditions
  const isOversold = rsi < 30;
  const isOverbought = rsi > 70;
  
  // Previous RSI for crossovers
  const isRsiBullishCrossover = (rsi_prev <= 30 && rsi > 30);
  const isRsiBearishCrossover = (rsi_prev >= 70 && rsi < 70);

  // Buy condition:
  // RSI oversold AND high volatility
  if (isOversold && isHighVolatility) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell condition:
  // RSI overbought AND (not necessarily high volatility since we are exiting)
  if (isOverbought && isRsiBearishCrossover) {
    return { side: 'sell', qty: ctx.position };
  }
  
  return null;
}
