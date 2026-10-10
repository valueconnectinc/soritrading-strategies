/*
 * @coinsori-strategy v1
 * name: BTC Regime Filter + Trailing Stop
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC's returns come from bull regimes, but tops are fast
 * and the SMA200 exits late, giving back large drawdowns. Adding a trailing
 * stop that ratchets up with price keeps the bull capture while cutting the
 * crash give-back.
 * When it buys and sells: buys when the last closed 4h bar closes above the
 * SMA(200) (~33 days); sells when a closed bar closes below the SMA200 OR below
 * a trailing floor (highest close since entry minus 3*ATR14). Long-only.
 * When it does NOT work: in long sideways chop the SMA whipsaws, and a sudden
 * V-shaped crash can still gap through the trailing stop. It never shorts, so
 * it makes nothing in bear markets.
 */
function onUpdate(ctx) {
  const close1 = ctx.closes.at(-2); // last CLOSED bar
  const sma = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (close1 == null || sma == null || atr == null) return null;

  if (ctx.position <= 0) {
    if (close1 > sma) {
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.95 };
    }
    ctx.watch([{ side: 'buy', price: sma, trigger: 'above', note: 'close above SMA200' }]);
    return null;
  }

  // Track the highest close since entry so the trail only ratchets up.
  const state = ctx.state || {};
  const hi = Math.max(state.hiSinceEntry || ctx.entryPx, close1);
  ctx.state = { hiSinceEntry: hi };
  const trail = hi - 3 * atr; // 3*ATR trail: wide enough to avoid normal noise

  if (close1 < sma || close1 < trail) {
    return { side: 'sell', qty: ctx.position };
  }
  ctx.watch([
    { side: 'sell', price: sma, trigger: 'below', note: 'close below SMA200' },
    { side: 'sell', price: trail, trigger: 'below', note: '3*ATR trailing stop' }
  ]);
  return null;
}
