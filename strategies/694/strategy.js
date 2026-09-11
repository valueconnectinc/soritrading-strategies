/*
 * @coinsori-strategy v1
 * name: RSI Overshoot Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the RSI indicator to identify oversold and overbought conditions. It buys when RSI drops below 30 (oversold) and sells when it rises above 70 (overbought), aiming to capture mean reversion opportunities.
 * When it buys and sells: It buys when RSI is below 30 and sells when RSI is above 70.
 * When it does NOT work: This strategy may not work well in strong trending markets where RSI remains in oversold or overbought regions for extended periods.
 */

function onUpdate(ctx) {
  // Get RSI value
  const rsi = ctx.rsi(14, 0);
  
  // Guard against null values
  if (rsi == null) {
    return null;
  }

  // Buy when RSI is below 30 (oversold)
  if (rsi < 30) {
    // Buy with 99% of available cash
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Sell when RSI is above 70 (overbought)
  if (rsi > 70) {
    // Sell entire position
    return { side: 'sell', qty: ctx.position };
  }

  // No action if RSI is between 30 and 70
  return null;
}
