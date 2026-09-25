/*
 * @coinsori-strategy v1
 * name: BTC 4H Volatility-Squeeze Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Markets alternate between compression (low volatility,
 *   tightening Bollinger bands) and expansion (sharp moves). A breakout right
 *   after a long squeeze often starts a strong directional run. This buys the
 *   expansion out of a squeeze — a different trigger from a volume surge.
 * When it buys and sells: Buy when the Bollinger band width has been squeezed
 *   to a 100-bar low and price closes back above the upper band (expansion
 *   begins). Exit when price closes back below the middle band or after a
 *   fixed ATR trailing stop.
 * When it does NOT work: A squeeze can resolve DOWNWARD just as easily as
 *   upward — buying every expansion catches frequent false breakouts and
 *   whipsaws. Needs the expansion to actually follow through.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  if (bb == null || bb.upper == null) return null;
  const mid = (bb.upper + bb.lower) / 2;
  if (mid <= 0) return null;
  const width = (bb.upper - bb.lower) / mid;

  const s = ctx.state;
  if (s.lastBarI !== ctx.i) {
    if (s.widths) s.widths.push(width);
    else s.widths = [width];
    if (s.widths.length > 100) s.widths.shift();
    s.lastBarI = ctx.i;
  }
  const w = s.widths;
  if (!w || w.length < 100) return null;

  // Squeeze: current width is the smallest in the last 100 bars.
  let minW = Infinity;
  for (const x of w) if (x < minW) minW = x;
  const squeezed = width <= minW * 1.001;

  const price = ctx.price;
  const pos = ctx.position;
  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    if (s.highest == null || price > s.highest) s.highest = price;
    if (price < s.highest - 3 * atr || price < bb.middle) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter only right after a squeeze, on an upward close above the upper band.
  if (squeezed && price > bb.upper) {
    s.highest = price;
    return { side: 'buy', qty: ctx.cash / price * 0.98 };
  }
  return null;
}
