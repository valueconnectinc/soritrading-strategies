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
 * above the upper band (a breakout out of the squeeze); sells when price falls back
 * to the middle band or the squeeze expands far past normal (trend exhausts).
 * When it does NOT work: in a long grinding range with no directional expansion the
 * squeeze just re-squeezes and the breakout whipsaws; and in a slow steady bull there
 * may be few clean squeezes so it sits in cash too long.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;

  const upper = bb.upper;
  const lower = bb.lower;
  const mid = bb.mid;

  // BB width = (upper-lower)/mid — a normalized measure of volatility
  const width = (upper - lower) / mid;
  if (width <= 0) return null;

  // Squeeze detection: width below its own recent average = contraction.
  // We approximate a "low percentile" by comparing to the average of the last N
  // widths. Keep a rolling list of past widths in state.
  const hist = ctx.state.widthHist || [];
  hist.push(width);
  if (hist.length > 60) hist.shift(); // keep last 60 daily widths (~3 months)
  ctx.state.widthHist = hist;

  if (hist.length < 30) return null; // need enough history to judge "low"

  const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
  const squeeze = width < avg * 0.7; // width at least 30% below its own 60-bar average

  // BUY: squeeze is on AND price closes above the upper band (breakout)
  if (squeeze && ctx.price > upper && ctx.position === 0) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }

  // SELL: price falls back to the middle band (breakout failed / mean reverts)
  // or the squeeze has expanded far past normal (trend likely exhausted)
  const expanded = width > avg * 2.0;
  if (ctx.position > 0 && (ctx.price <= mid || expanded)) {
    return { side: 'sell', qty: ctx.position };
  }

  return null;
}
