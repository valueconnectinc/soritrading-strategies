/*
 * @coinsori-strategy v1
 * name: BTC FearGreed Contrarian 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Crypto Fear & Greed Index measures crowd emotion. Extreme fear (<20) marks panic-selling bottoms; the bounce from panic back to neutral sentiment is the trade.
 * When it buys and sells: Buys when the index drops below 20 while flat. Sells when sentiment recovers above 55 (panic over, mean reversion complete) or after 150 days in the trade.
 * When it does NOT work: In a prolonged bear the index can stay in extreme fear for months while price keeps falling — there is no stop, so a deep bear means a deep drawdown. It also misses neutral-sentiment rallies entirely.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');
  if (fg == null) return null; // sentiment data unknown -> no trade

  const price = ctx.price;
  const holding = ctx.position > 0;

  if (!holding) {
    if (fg < 20) { // extreme fear = panic bottom, contrarian buy
      ctx.state.barsIn = 0;
      ctx.watch([{ side: 'buy', price: price, note: 'extreme fear buy' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  const barsIn = (ctx.state.barsIn == null ? 0 : ctx.state.barsIn) + 1;
  ctx.state.barsIn = barsIn;

  // exit when sentiment normalizes (mean reversion complete) or after 150 days
  if (fg > 55 || barsIn >= 150) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
