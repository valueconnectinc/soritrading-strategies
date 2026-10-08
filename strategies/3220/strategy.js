/*
 * @coinsori-strategy v1
 * name: Fear-Greed Sentiment Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: the Fear & Greed index is a crowd-sentiment gauge; extreme fear
 * has historically marked good entry points in an uptrend, extreme greed good exits.
 * It combines a sentiment (external data) trigger with a long-term trend filter.
 * When it buys and sells: buys when sentiment is below 30 (fear) AND price is above
 * its 200-day average (uptrend intact). Sells when sentiment reaches 70+ (greed) or
 * price breaks below the 200-day average.
 * When it does NOT work: in a prolonged bear market the trend filter keeps you out
 * (correctly), and fear can stay high while price keeps falling. In choppy sideways
 * markets it may fire rarely. It can miss fast rallies that start from neutral sentiment.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;
  const trendUp = ctx.closes[ctx.closes.length - 2] > sma200; // closed bar above SMA200

  if (ctx.position <= 0 && trendUp && fg <= 30) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  if (ctx.position > 0 && (!trendUp || fg >= 70)) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
