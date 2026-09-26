/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout SOL 4H v3 trail
 * ex: binance
 * syms: SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Volatility contraction builds energy for a breakout. This
 * version keeps the relative-compression entry from v2 but replaces the tight
 * mid-band exit with a 3x-ATR trailing stop (the exit that made the volume-surge
 * breakout family work on SOL) so winners can run.
 * When it buys and sells: buys when the 20-2 Bollinger width is compressed to
 * ~65% of its rolling average AND price closes above the upper band on
 * above-average volume. Exits on a 3x-ATR trailing stop from the peak.
 * When it does NOT work: in persistent downtrends the squeeze resolves downward
 * and the upper-band entry fires into a falling market; the ATR trail can give
 * back a large run in a sharp reversal. Needs genuine post-squeeze expansion.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  if (bb == null) return null;
  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    const atr = ctx.atr(14, 1);
    if (atr == null) return null;
    // Trailing stop: track the highest price since entry; exit when price falls
    // 3x ATR below that peak. Lets winners run, cuts losers short.
    const peak = Math.max(ctx.state.peak || ctx.entryPx, price);
    ctx.state.peak = peak;
    if (price <= peak - atr * 3) {
      ctx.state.lastExit = ctx.i;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const lastExit = ctx.state.lastExit || 0;
  if (ctx.i - lastExit < 5) return null;

  // Relative compression: track a rolling EMA of band width in state.
  const width = (bb.upper - bb.lower) / bb.mid;
  let wAvg = ctx.state.wAvg;
  if (wAvg == null) wAvg = width;
  else wAvg = wAvg * 0.95 + width * 0.05;
  ctx.state.wAvg = wAvg;
  if (wAvg <= 0) return null;

  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (vol == null || avgVol == null) return null;
  if (vol < avgVol * 1.2) return null; // require volume confirmation on the break

  if (width <= wAvg * 0.65 && price > bb.upper) {
    ctx.state.peak = price;
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.95 };
  }
  return null;
}
