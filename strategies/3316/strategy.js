/*
 * @coinsori-strategy v1
 * name: BTC Regime Filter SMA200
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC's long-term return comes almost entirely from bull
 * regimes; bear regimes give it all back. Being LONG only while price holds
 * above a long moving average captures the bull trend and sidesteps the bear.
 * When it buys and sells: buys when the last closed 4h bar closes above the
 * SMA(200) (~33 days) and stays out while it is below; sells when a closed bar
 * closes back below the SMA. Long-only, very few trades.
 * When it does NOT work: in a long sideways range price repeatedly crosses the
 * SMA and whipsaws; and it exits late at the start of a crash, so it still
 * gives back part of every top. It never shorts, so it makes nothing in bears.
 */
function onUpdate(ctx) {
  const close1 = ctx.closes.at(-2); // last CLOSED bar
  const sma = ctx.sma(200, 1);
  if (close1 == null || sma == null) return null;

  if (ctx.position <= 0) {
    if (close1 > sma) {
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.95 };
    }
    ctx.watch([{ side: 'buy', price: sma, trigger: 'above', note: 'close above SMA200' }]);
    return null;
  }

  if (close1 < sma) {
    return { side: 'sell', qty: ctx.position };
  }
  ctx.watch([{ side: 'sell', price: sma, trigger: 'below', note: 'close below SMA200' }]);
  return null;
}
