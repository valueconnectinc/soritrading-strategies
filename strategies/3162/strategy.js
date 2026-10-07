/*
 * BTC 200-Day Trend Hysteresis 1D
 * Idea: plain 200-SMA whipsaws in choppy markets (re-enters on every fake
 * breakout). Adding a 5% band around the SMA means we only enter on a clear
 * breakout above SMA*1.05 and only exit below SMA*0.95 — fewer, stronger trades.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const holding = ctx.position > 0;

  if (!holding && price > sma200 * 1.05) {
    ctx.watch([{ side: 'buy', price: price, note: 'breakout above 200d' }]);
    return { side: 'buy', qty: ctx.cash / price * 0.99 };
  }
  if (holding && price < sma200 * 0.95) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
