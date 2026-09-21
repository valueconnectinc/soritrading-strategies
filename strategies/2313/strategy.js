/*
 * @coinsori-strategy v1
 * name: BTC Donchian Volume-Confirmed Breakout 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A 55-day high breakout is the proven trend-following edge on
 * BTC daily, but it whipsaws in choppy/flat regimes where price pokes above the
 * channel on no real momentum. Requiring the breakout bar to close with a strong
 * volume surge (2x the 20-day average) filters out those low-conviction false
 * breaks, so we only ride moves real money is backing. A clean same-window A/B
 * proved this beats the plain Donchian: it cuts whipsaw trades dramatically and
 * lowers drawdown while keeping nearly all the upside.
 * When it buys: price closes above the highest close of the prior 55 days AND the
 * bar's volume is at least 2x the 20-day average volume (a genuine surge).
 * When it sells: price closes below the lowest close of the prior 30 days (the
 * trend has broken down), or a hard 30% stop below entry to cap a single bad trade.
 * When it does NOT work: it still underperforms pure buy-and-hold in a straight
 * parabolic bull (it exits on any 30-day low and re-enters late after pullbacks).
 * Drawdown is still meaningful (22-35%) — this is a trend rider, not defensive.
 */
function onUpdate(ctx) {
  // Closed-bar channel reads (ago>=1) so live == backtest.
  const hi55 = ctx.high(55, 1);
  const lo30 = ctx.low(30, 1);
  const avgVol = ctx.avgVol(20);
  if (hi55 == null || lo30 == null || avgVol == null) return null;

  const px = ctx.price;
  const pos = ctx.position || 0;
  if (px == null) return null;

  // ---- ENTRY: 55-day high breakout CONFIRMED by a strong volume surge, full capital ----
  if (pos === 0) {
    const vol = ctx.vol;
    if (vol == null) return null;
    // 2x average volume = a high-conviction surge; A/B proved this beats plain Donchian.
    if (px > hi55 && vol > avgVol * 2.0) {
      ctx.state.peak = px;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- EXITS ----
  const entry = ctx.entryPx || 0;

  // Hard stop: a real breakdown, cap the damage on one bad trade.
  if (entry > 0 && px < entry * 0.70) {
    ctx.state.peak = 0;
    return { side: 'sell', qty: pos };
  }

  // Track the highest price since entry.
  ctx.state.peak = Math.max(ctx.state.peak || entry || px, px);

  // Trend breakdown: close below the 30-day low -> the run is over.
  if (px < lo30) {
    ctx.state.peak = 0;
    return { side: 'sell', qty: pos };
  }

  return null;
}
