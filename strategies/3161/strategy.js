/*
 * BTC 200-Day Trend 1D
 * Idea: BTC's long-term trend is the strongest signal there is. Stay in the
 * market while price is above its 200-day average, get out when the trend breaks.
 * This is the baseline every regime filter tried to beat.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const holding = ctx.position > 0;

  if (!holding && price > sma200) {
    ctx.watch([{ side: 'buy', price: price, note: 'above 200d' }]);
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  if (holding && price < sma200) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
