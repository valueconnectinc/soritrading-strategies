/*
 * ETH 4H Dip-Rebound 4H
 * Idea: on 4h, ETH mean-reverts inside an uptrend — sharp oversold dips
 * (RSI low + price below lower Bollinger) bounce back. Buy the dip only when
 * the medium trend (100-bar SMA) is up, so we never catch a falling knife.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  const sma100 = ctx.sma(100, 1);
  if (sma100 == null) return null;
  const bb = ctx.bb(20, 2, 1);
  if (bb == null) return null;
  const rsi = ctx.rsi(14, 1);
  if (rsi == null) return null;

  const holding = ctx.position > 0;

  if (!holding) {
    // dip: price below lower band AND RSI oversold, but only in an uptrend
    if (price > sma100 && price < bb.lower && rsi < 35) {
      ctx.watch([{ side: 'buy', price: price, note: 'oversold dip in uptrend' }]);
      return { side: 'buy', qty: ctx.cash / price * 0.99 };
    }
    return null;
  }

  // exit when price recovers to the middle band (mean reversion complete)
  if (price > bb.mid) {
    return { side: 'sell', qty: ctx.position };
  }
  // emergency exit: trend broke down, stop catching the knife
  if (price < sma100 * 0.95) {
    return { side: 'sell', qty: ctx.position };
  }
  return null;
}
