/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BNBUSDT
 * interval: 1h
 * cash: 1000

 * Why this strategy: The strategy is based on the RSI indicator to identify overbought and oversold conditions. When RSI goes below 30, it indicates an oversold condition and a buying opportunity. When RSI goes above 70, it indicates an overbought condition and a selling opportunity.
 * When it buys and sells: It buys when RSI is below 30 and sells when RSI is above 70.
 * When it does NOT work: This strategy may fail in strong trending markets where prices move consistently above or below the RSI thresholds for extended periods.
 */

function onUpdate(ctx) {
  // Get RSI value
  const rsi = ctx.rsi(14, 0);
  const rsiPrev = ctx.rsi(14, 1);

  // Ensure we have enough data
  if (rsi == null || rsiPrev == null) {
    return null;
  }

  // Check for oversold condition (buy signal)
  if (rsi < 30 && rsiPrev >= 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // Check for overbought condition (sell signal)
  if (rsi > 70 && rsiPrev <= 70) {
    // If we are long, close the position
    if (ctx.position > 0) {
      return { side: 'sell', qty: ctx.position };
    }
  }

  return null;
}
