/*
 * @coinsori-strategy v1
 * name: BTC 4H Volatility-Squeeze Breakout
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: A genuinely different signal family from the price/volume trend
 *   champions — it trades VOLATILITY REGIME, not price direction. Markets often
 *   consolidate (Bollinger bands squeeze narrow), then break out with a strong move.
 *   Bet: buying the first expansion out of a squeeze catches the start of a new trend,
 *   which is a different edge than riding an existing trend.
 * When it buys and sells: Buy when the Bollinger-band width is at its lowest in 50 bars
 *   (squeeze) AND price closes above the upper band (expansion up). Sell when price
 *   closes back below the middle band, or after 30 bars.
 * When it does NOT work: Squeezes often resolve sideways or with a false breakout that
 *   reverses immediately — this whipsaws in choppy ranges. It is long-only, so it misses
 *   downside expansions (short-side gains) in bear markets.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2);
  if (bb == null) return null;
  const width = bb.upper - bb.lower;
  if (width <= 0) return null;

  // compute current band width vs its 50-bar history
  let minWidth = Infinity;
  for (let i = 1; i <= 50; i++) {
    const b = ctx.bb(20, 2, i);
    if (b == null) return null;
    const w = b.upper - b.lower;
    if (w < minWidth) minWidth = w;
  }
  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    // exit: close back below middle band, or time stop after 30 bars
    if (price < bb.mid) return { side: 'sell', qty: pos };
    const s = ctx.state;
    if (s.entryBar != null && ctx.i - s.entryBar >= 30) return { side: 'sell', qty: pos };
    return null;
  }

  // entry: width at 50-bar minimum (squeeze) and close above upper band (expansion up)
  if (width <= minWidth && price > bb.upper) {
    const s = ctx.state;
    s.entryBar = ctx.i;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.98 };
  }
  return null;
}
