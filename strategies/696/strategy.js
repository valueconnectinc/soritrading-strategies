/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Strategy BNBUSDT 1h
 * ex: binanceusdm
 * syms: BNBUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy uses the RSI (Relative Strength Index) to identify overbought and oversold conditions for mean reversion opportunities.
 * When it buys and sells: It buys when RSI is below 30 (oversold) and sells when RSI is above 70 (overbought).
 * When it does NOT work: This strategy may fail during strong trends where prices remain overbought or oversold for extended periods.
 */

function onUpdate(ctx) {
  // Get the RSI value with a 14-period window
  const rsi = ctx.rsi(14); 

  if (rsi == null) return null; // Wait for enough data

  const position = ctx.position;
  const cash = ctx.cash;
  const price = ctx.price;

  // Buy when RSI is below 30 (oversold)
  if (rsi < 30 && position <= 0) {
    // Buy 99% of available cash
    return {
      side: 'buy',
      qty: cash / price * 0.99
    };
  }

  // Sell when RSI is above 70 (overbought)
  if (rsi > 70 && position > 0) {
    // Sell the entire position
    return {
      side: 'sell',
      qty: position
    };
  }

  return null;
}
