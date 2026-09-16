/*
 * @coinsori-strategy v1
 * name: RSI Mean Reversion Strategy
 * ex: binanceusdm
 * syms: BTCUSDT
 * interval: 1h
 * cash: 10000
 *
 * Why this strategy: This strategy uses RSI (Relative Strength Index) to identify overbought and oversold conditions for mean reversion trading. It aims to buy during oversold periods and sell during overbought periods.
 * When it buys and sells: The strategy buys when RSI crosses below 30 (oversold) and sells when RSI crosses above 70 (overbought).
 * When it does NOT work: This strategy may fail during strong trending markets where assets remain in overbought or oversold conditions for extended periods.
 */

function onUpdate(ctx) {
  // Get RSI with 1-bar lag
  const rsi = ctx.rsi(14, 1);
  const rsiPrev = ctx.rsi(14, 2);
  
  // Check if indicators are valid
  if (rsi === null || rsiPrev === null) {
    return null;
  }
  
  // BUY condition: RSI crosses below 30 (oversold)
  if (rsiPrev >= 30 && rsi < 30) {
    ctx.log("BUY condition met - RSI oversold");
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // SELL condition: RSI crosses above 70 (overbought)
  if (rsiPrev <= 70 && rsi > 70) {
    ctx.log("SELL condition met - RSI overbought");
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
