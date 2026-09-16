/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: This strategy enhances the mean reversion concept with RSI (Relative Strength Index) to better identify overbought and oversold conditions. It aims to reduce false signals by combining price deviation from SMA with RSI readings.
 * When it buys and sells: The strategy buys when the price deviates significantly below the SMA AND RSI is in oversold territory (<30). It sells when price deviates significantly above the SMA AND RSI is in overbought territory (>70).
 * When it does NOT work: This strategy may not perform well in strong trending markets where RSI remains in overbought/oversold zones for an extended time, ignoring mean reversion.
 */

function onUpdate(ctx) {
  // Use a 20-period simple moving average
  const sma = ctx.sma(20);
  
  // Use a 14-period RSI
  const rsi = ctx.rsi(14);
  
  // Get the current price
  const price = ctx.price;
  
  // Guard against null values
  if (sma == null || rsi == null) return null;

  // Calculate the percentage difference between price and SMA
  const diffPercent = (price - sma) / sma;

  // Buy when price is significantly below the SMA AND RSI is oversold (<30)
  if (diffPercent < -0.02 && rsi < 30) {
    // Return a buy order for 99% of available cash
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }

  // Sell when price is significantly above the SMA AND RSI is overbought (>70)
  if (diffPercent > 0.02 && rsi > 70) {
    // Return a sell order for the current position
    return { side: 'sell', qty: ctx.position };
  }

  // Do nothing otherwise
  return null;
}
