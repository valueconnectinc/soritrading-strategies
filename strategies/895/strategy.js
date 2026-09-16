/*
 * @coinsori-strategy v1
 * name: Mean Reversion with ATR Filter Improved
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy exploits mean reversion in cryptocurrency prices, using ATR to filter out low-volatility periods where price movements are less predictable. It identifies overbought and oversold zones with RSI and enters trades when prices revert to the mean.
 * When it buys and sells: The strategy buys when RSI drops below 30 (oversold) and sells when RSI rises above 70 (overbought). ATR filters out low volatility periods, making entries more reliable.
 * When it does NOT work: This strategy may fail during strong trending markets where prices move consistently in one direction, ignoring mean reversion. It is also vulnerable to sudden market shocks that break the established patterns.
 */

function onUpdate(ctx) {
  // Calculate RSI and ATR
  const rsi = ctx.rsi(14);
  const atr = ctx.atr(14);
  
  // Guard against null values
  if (rsi == null || atr == null) return null;
  
  // ATR threshold for volatility filtering (we use 2x the average ATR as a filter)
  const atrThreshold = ctx.avgVol(14) * 2;  // Use average volume over 14 periods to estimate a baseline

  // Only enter trades when volatility is above threshold
  if (atr < atrThreshold) {
    return null;
  }

  // If position is already open, check for exit conditions
  if (ctx.position !== 0) {
    // Exit long positions when RSI rises above 70
    if (ctx.position > 0 && rsi > 70) {
      return { side: 'sell', qty: ctx.position };
    }
    // Exit short positions when RSI falls below 30
    if (ctx.position < 0 && rsi < 30) {
      return { side: 'buy', qty: Math.abs(ctx.position) };
    }
    return null;
  }

  // Enter long trades when RSI is below 30 and ATR is above the threshold
  if (rsi < 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 }; // Use 99% of cash to buy
  }

  // Enter short trades when RSI is above 70 and ATR is above the threshold
  if (rsi > 70) {
    return { side: 'sell', qty: ctx.cash / ctx.price * 0.99 }; // Use 99% of cash to sell
  }

  return null;
}
