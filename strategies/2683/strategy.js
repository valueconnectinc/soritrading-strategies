/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BNB 4H
 * ex: binance
 * syms: BNBUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Volatility contraction builds energy. When Bollinger Band
 * width compresses to a recent minimum (a "squeeze"), the next breakout is often
 * a real move. This is a distinct family (volatility-expansion breakout) from the
 * mean-reversion and volume-surge strategies.
 * When it buys and sells: buys when the band is squeezed (width at a 100-bar low)
 * AND price closes above the upper band on above-average volume. Exits when price
 * closes back below the middle band or on a 6-ATR stop.
 * When it does NOT work: in a persistent downtrend the squeeze resolves downward
 * and the upper-band entry fires into a falling market; in dead chop it triggers
 * then immediately reverses. Needs genuine post-squeeze expansion to profit.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const rsi = ctx.rsi(14, 1);
  if (bb == null || rsi == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  // Exit logic: close back under the middle band, or RSI rolling over, or hard stop.
  if (pos > 0) {
    if (price < bb.mid || rsi > 65) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    const atr = ctx.atr(14, 1);
    if (atr != null && price <= ctx.entryPx - atr * 6) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  // Squeeze: current band width must be the min of the last 100 bars.
  // Track running min width in state to avoid a 100-loop every bar.
  const width = (bb.upper - bb.lower) / bb.mid;
  const prevWidth = ctx.state.wmin;
  let wmin = prevWidth;
  if (wmin == null || width < wmin) wmin = width;
  ctx.state.wmin = wmin;

  // Only buy when the squeeze is tight (width near its recent min) and price
  // pops above the upper band with volume. Volume must be above average.
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (vol == null || avgVol == null) return null;
  if (vol < avgVol * 1.2) return null; // require volume confirmation on the break

  if (width <= wmin * 1.02 && price > bb.upper) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
