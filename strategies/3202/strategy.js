/*
 * @coinsori-strategy v1
 * name: BASELINE BTC 1D Momentum Hysteresis
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: copy of validated champion #3192 for apples-to-apples
 * comparison on identical windows with the new on-chain gated variant.
 * When it buys and sells: Buy when 90-day change > +20% and price above
 * 200-day average. Sell when 90-day change < +5% or price below 200-day avg.
 * When it does NOT work: slow signals whipsaw in chop; late in V-reversals.
 */
function onUpdate(ctx) {
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const closes = ctx.closes;
  if (closes.length < 91) return null;
  const prevClose = closes[closes.length - 2];
  const base = closes[closes.length - 91];
  if (base == null || base <= 0) return null;
  const roc90 = (prevClose / base - 1) * 100;

  if (ctx.position > 0 && (roc90 < 5 || prevClose < sma200)) {
    return { side: 'sell', qty: ctx.position };
  }
  if (ctx.position === 0 && roc90 > 20 && prevClose > sma200) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
