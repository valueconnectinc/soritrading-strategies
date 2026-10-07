/*
 * @coinsori-strategy v1
 * name: BTC FearGreed Contrarian 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Crypto Fear & Greed Index measures crowd emotion. Extreme fear (<20) has historically marked panic-selling bottoms and extreme greed (>80) euphoric tops.
 * When it buys and sells: Buys when the index drops below 20 while flat. Sells when the index climbs above 80, when price falls 15% below the entry (stop-loss), or after 90 days in the trade.
 * When it does NOT work: In a long bear market the index can sit in extreme fear for months while price keeps dropping, so the stop-loss takes small losses repeatedly. It also underperforms in a steady bull where sentiment stays neutral and never triggers.
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

  const stop = ctx.entryPx * 0.85; // 15% stop caps damage in prolonged bears
  ctx.watch([{ side: 'sell', price: stop, note: '15% stop-loss' }]);
  if (fg > 80 || price < stop || barsIn >= 90) { // greed exit, stop, or time exit
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
