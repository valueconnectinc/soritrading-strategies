/*
 * BTC FearGreed Contrarian v2 1D
 * Idea: the Crypto Fear & Greed Index measures crowd emotion; extreme fear (<15)
 * marks panic-selling bottoms. Buy the panic, sell the recovery back to neutral.
 * v2 adds a hard -30% stop because v1 had no stop and a prolonged bear would
 * (and did in 2018/2022) ride the price down for months while fear stayed low.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null; // sentiment data unknown -> no trade

  const price = ctx.price;
  const holding = ctx.position > 0;

  if (!holding) {
    if (fg < 15) { // deeper extreme fear = panic bottom, contrarian buy
      ctx.state.entryPx = price;
      ctx.state.barsIn = 0;
      ctx.watch([{ side: 'buy', price: price, note: 'extreme fear buy' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  const entryPx = ctx.state.entryPx == null ? price : ctx.state.entryPx;
  ctx.state.entryPx = entryPx;

  // hard stop: exit if price falls 30% below entry (cuts prolonged-bear loss)
  if (price < entryPx * 0.70) {
    return { side: 'sell', qty: ctx.position };
  }

  const barsIn = (ctx.state.barsIn == null ? 0 : ctx.state.barsIn) + 1;
  ctx.state.barsIn = barsIn;

  // exit when sentiment normalizes (mean reversion complete) or after 250 days
  if (fg > 50 || barsIn >= 250) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
