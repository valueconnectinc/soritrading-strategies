/*
 * @coinsori-strategy v1
 * name: BTC Plain Donchian 55/30 1D (A/B baseline)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * A/B comparison baseline: the plain Donchian 55/30 daily breakout with NO volume
 * filter, to isolate the effect of the volume-surge entry filter in strategy 2310.
 * Why: the proven family champion, full capital, no entry confirmation.
 * When it buys: close above the highest close of the prior 55 days.
 * When it sells: close below the lowest close of the prior 30 days, or a hard 30%
 * stop below entry.
 * When it does NOT work: choppy sideways markets whipsaw it, and it underperforms
 * buy-and-hold in steady bulls (exits on any 30-day low, re-enters late).
 */
function onUpdate(ctx) {
  const hi55 = ctx.high(55, 1);
  const lo30 = ctx.low(30, 1);
  if (hi55 == null || lo30 == null) return null;

  const px = ctx.price;
  const pos = ctx.position || 0;
  if (px == null) return null;

  if (pos === 0) {
    if (px > hi55) {
      ctx.state.peak = px;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  const entry = ctx.entryPx || 0;
  if (entry > 0 && px < entry * 0.70) {
    ctx.state.peak = 0;
    return { side: 'sell', qty: pos };
  }

  ctx.state.peak = Math.max(ctx.state.peak || entry || px, px);
  if (px < lo30) {
    ctx.state.peak = 0;
    return { side: 'sell', qty: pos };
  }

  return null;
}
