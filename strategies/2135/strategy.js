/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed Contrarian 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: crowd sentiment extremes in crypto are contrarian signals.
 * When the Fear & Greed index is at extreme fear, most people are selling and prices
 * are cheap; when it is at extreme greed, everyone is buying and prices are rich.
 * We buy the fear and sell the greed.
 * When it buys and sells: it buys when the index drops below 25 (extreme fear) and
 * sells when it rises above 75 (extreme greed). It uses the daily sentiment index.
 * When it does NOT work: in a long one-way bull market greed never cools off and the
 * strategy sells too early; in a sustained bear market fear stays low and it keeps
 * buying into a falling knife.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  const fgPrev = ctx.data('fear_greed'); // poll data, same value within a day
  if (fg == null || fgPrev == null) return null;

  const pos = ctx.position;
  const price = ctx.price;

  if (pos <= 0) {
    if (fg < 25) {
      return { side: 'buy', qty: (ctx.cash / price) * 0.98 };
    }
    return null;
  } else {
    if (fg > 75) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
