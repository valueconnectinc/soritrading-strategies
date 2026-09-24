/*
 * @coinsori-strategy v1
 * name: BTC Bollinger Squeeze Breakout 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 1000
 *
 * Why this strategy: a Bollinger Band squeeze (BB width contracting to a low
 * percentile) marks a period of unusually low volatility, which is often followed
 * by an expansion — a directional move. This exploits the volatility-contraction →
 * expansion "spring" effect, a mechanism completely different from the mean-reversion
 * champion of this job. It is a trend-following/breakout family, not a reversal one.
 * When it buys and sells: buys when BB width is in its lowest ~30% AND price closes
 * above the upper band (a breakout out of the squeeze); sells on an ATR trailing stop
 * (2.5 ATR below the highest close since entry) so a real expansion can run, instead
 * of selling at the mid-band too early.
 * When it does NOT work: in a long grinding range with no directional expansion the
 * squeeze just re-squeezes and the breakout whipsaws; and in a slow steady bull there
 * may be few clean squeezes so it sits in cash too long.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const upper = bb.upper;
  const lower = bb.lower;

  const width = (upper - lower) / bb.mid;
  if (width <= 0) return null;

  const hist = ctx.state.widthHist || [];
  hist.push(width);
  if (hist.length > 60) hist.shift();
  ctx.state.widthHist = hist;
  if (hist.length < 30) return null;

  const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
  const squeeze = width < avg * 0.7;

  // BUY: squeeze on AND price closes above the upper band (breakout)
  if (squeeze && ctx.price > upper && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: ATR trailing stop — exit when price is 2.5 ATR below the highest close
  // since entry. This lets a real expansion run instead of cutting at the mid-band.
  const atr = ctx.atr(14);
  if (atr == null) return null;

  if (ctx.position > 0) {
    const hi = Math.max(ctx.state.highest || ctx.price, ctx.price);
    ctx.state.highest = hi;
    const stop = hi - atr * 2.5;
    if (ctx.price < stop) {
      ctx.state.highest = 0;
      return { side: 'sell', qty: ctx.position };
    }
  } else {
    ctx.state.highest = 0;
  }

  return null;
}
