/*
 * @coinsori-strategy v1
 * name: ATR-Channel Trend Follow BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: In an established trend, price tends to ride along the
 * edge of an ATR channel around the short-term average. A close above the
 * upper channel signals a new up-leg to follow; a close below the lower
 * channel signals the trend has broken and it is time to exit.
 * When it buys and sells: buys when price closes above the 20-day EMA plus
 * 2x ATR; sells when price closes below the 20-day EMA minus 2x ATR.
 * When it does NOT work: in choppy sideways markets price whipsaws in and
 * out of the channel, generating many small losing trades; in fast crashes
 * it exits only after a full ATR-channel break, giving back a lot.
 */
function onUpdate(ctx) {
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  if (ema20 == null || atr == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // exit when price closes below the lower ATR channel (trend broken)
    if (price < ema20 - atr * 2) return { side: 'sell', qty: pos };
    return null;
  }

  // enter when price closes above the upper ATR channel (new up-leg)
  if (price > ema20 + atr * 2) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
