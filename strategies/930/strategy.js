/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: The strategy is based on the mean reversion theory, which suggests that prices tend to revert to their mean over time. RSI (Relative Strength Index) is used to identify overbought and oversold conditions where a reversal is likely.
 * When it buys and sells: It buys when RSI crosses below 30 (oversold) and sells when RSI crosses above 70 (overbought). This strategy aims to capitalize on price reversals in ranging markets.
 * When it does NOT work: This strategy may fail in strong trending markets where prices continue to move in the same direction for extended periods, causing frequent false signals or prolonged holding in unfavorable conditions.
 */

function onUpdate(ctx) {
  const rsi = ctx.rsi(14); // RSI with 14-period
  if (rsi == null) return null;

  // Check for buy signal: RSI crosses below 30 (oversold)
  if (rsi < 30 && ctx.rsi(14, 1) >= 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Check for sell signal: RSI crosses above 70 (overbought)
  if (rsi > 70 && ctx.rsi(14, 1) <= 70) {
    return { side: 'sell', qty: ctx.position };
  }

  // No action
  return null;
}
