/*
 * @coinsori-strategy v1
 * name: BTC Fear-Greed Contrarian
 * ex: binance
 * syms: BTC
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The crypto fear-greed index is a sentiment gauge. Crowds are wrong at
 * extremes — extreme fear (panic selling) tends to mark bottoms, extreme greed (euphoria) tops.
 * When it buys and sells: buys when the index is in extreme fear (<20) and sells when it reaches
 * extreme greed (>80), or when price closes below the 200-day SMA (trend broke), or on a 2xATR stop.
 * When it does NOT work: in strong one-way trends the index can stay extreme for a long time —
 * buying early in a bear and selling early in a bull costs money. Also if the dataset stops
 * updating the strategy simply stays flat.
 */
function onUpdate(ctx) {
  const fg = ctx.data('fear_greed');   // user's own dataset, 0-100 index
  if (fg == null) return null;         // data not available -> never trade

  const atr = ctx.atr(14, 1);
  const sma200 = ctx.sma(200, 1);      // long-term trend, for risk management
  const prevClose = ctx.closes.at(-2);
  if (atr == null || sma200 == null || prevClose == null) return null;

  const pos = ctx.position;

  if (pos > 0) {
    // exit: greed reached, trend broke, or hard stop
    const stop = ctx.entryPx - 2 * atr;
    ctx.watch([
      { side: 'sell', price: stop, trigger: 'below', note: '2xATR hard stop' },
      { side: 'sell', price: sma200, trigger: 'below', note: '200d SMA broke' },
      { side: 'sell', note: 'fear-greed > 80', conds: [{ label: 'fear-greed', now: fg, op: '>', ref: 80, closed: true }] }
    ]);
    if (fg > 80 || prevClose < sma200 || prevClose < stop) return { side: 'sell', qty: pos };
    return null;
  }

  // buy: extreme fear
  if (fg < 20) {
    ctx.watch([{ side: 'buy', note: 'fear-greed < 20', conds: [{ label: 'fear-greed', now: fg, op: '<', ref: 20, closed: true }] }]);
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
