/*
 * BTC 200-Day Trend Hysteresis 7% 1D
 * Idea: same as 3162 but with a 7% band — robustness check that the edge
 * is not a knife-edge at exactly 5%.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const holding = ctx.position > 0;
  if (!holding && price > sma200 * 1.07) {
    ctx.watch([{ side: 'buy', price: price, note: 'breakout above 200d' }]);
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  if (holding && price < sma200 * 0.93) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
