/*
 * @coinsori-strategy v1
 * name: Simple Mean Reversion Strategy
 * ex: binance
 * syms: BTCUSDT
 * interval: 1h
 * cash: 1000
 *
 * Why this strategy: The strategy exploits price mean reversion using Bollinger Bands. When price touches lower band, it buys; when it touches upper band, it sells.
 * When it buys and sells: It buys when price touches lower Bollinger Band (indicating oversold), and sells when it touches upper Bollinger Band (indicating overbought).
 * When it does NOT work: This strategy may fail in strong trending markets where price continues moving in one direction without retracing to bands.
 */
function onUpdate(ctx) {
  // Get Bollinger Bands values
  const bb = ctx.bb(20, 2, 0); 
  if (bb == null) return null;

  // Check for buy condition - price touches lower band
  if (ctx.price <= bb.lower) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  
  // Check for sell condition - price touches upper band
  if (ctx.price >= bb.upper) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
