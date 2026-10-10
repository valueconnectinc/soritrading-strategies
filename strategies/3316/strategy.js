/*
 * @coinsori-strategy v1
 * name: BTC Regime Filter + Chandelier Stop
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC's returns come from bull regimes, but tops are fast
 * and the SMA200 exits late, giving back large drawdowns. A chandelier stop
 * (highest recent high minus 3*ATR) ratchets up with price and cuts the crash
 * give-back while the SMA200 still gates the regime.
 * When it buys and sells: buys when the last closed 4h bar closes above the
 * SMA(200) (~33 days); sells when a closed bar closes below the SMA200 OR below
 * (highest high of last 20 bars minus 3*ATR14). Long-only, stateless.
 * When it does NOT work: in long sideways chop the SMA whipsaws, and a sudden
 * V-shaped crash can still gap through the chandelier stop. It never shorts,
 * so it makes nothing in bear markets.
 */
function onUpdate(ctx) {
  const close1 = ctx.closes.at(-2); // last CLOSED bar
  const sma = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  const hh = ctx.high(20, 1); // highest high of last 20 closed bars
  if (close1 == null || sma == null || atr == null || hh == null) return null;

  if (ctx.position <= 0) {
    if (close1 > sma) {
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.95 };
    }
    ctx.watch([{ side: 'buy', price: sma, trigger: 'above', note: 'close above SMA200' }]);
    return null;
  }

  const trail = hh - 3 * atr; // chandelier exit: 3*ATR below the recent high
  if (close1 < sma || close1 < trail) {
    return { side: 'sell', qty: ctx.position };
  }
  ctx.watch([
    { side: 'sell', price: sma, trigger: 'below', note: 'close below SMA200' },
    { side: 'sell', price: trail, trigger: 'below', note: '3*ATR chandelier stop' }
  ]);
  return null;
}
