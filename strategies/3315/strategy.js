/*
 * @coinsori-strategy v1
 * name: BTC Donchian Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: BTC's biggest moves happen when price breaks out of a
 * multi-day range and then trends. A Donchian breakout enters on the break and
 * rides the trend with a trailing exit, catching the fat right tail.
 * When it buys and sells: buys when the last closed 4h bar closes above the
 * highest high of the prior 20 bars; sells when a closed bar closes below the
 * lowest low of the prior 10 bars (trailing stop). Long-only.
 * When it does NOT work: in long sideways chop it buys every fake breakout and
 * stops out repeatedly (whipsaw), and it misses fast reversals because the exit
 * lags. It holds through drawdowns while a trend is intact.
 */
function onUpdate(ctx) {
  const close1 = ctx.closes.at(-2); // last CLOSED bar
  if (close1 == null) return null;

  if (ctx.position <= 0) {
    // Entry: closed bar breaks above the prior 20-bar high (donchian 20).
    const hh = ctx.high(20, 2);
    if (hh == null) return null;
    if (close1 > hh) {
      return { side: 'buy', qty: (ctx.cash / ctx.price) * 0.95 };
    }
    ctx.watch([{ side: 'buy', price: hh, trigger: 'above', note: '20-bar high breakout' }]);
    return null;
  }

  // Exit: closed bar breaks below the prior 10-bar low (trailing stop).
  const ll = ctx.low(10, 2);
  if (ll == null) return null;
  if (close1 < ll) {
    return { side: 'sell', qty: ctx.position };
  }
  ctx.watch([{ side: 'sell', price: ll, trigger: 'below', note: '10-bar low trailing stop' }]);
  return null;
}
