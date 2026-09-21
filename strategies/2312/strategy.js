/*
 * @coinsori-strategy v1
 * name: BTC Donchian Vol-Confirm 2.0x 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Robustness check of the volume-confirmed Donchian 55/30 (strat 2310) with a
 * STRICTER 2.0x volume threshold instead of 1.5x. Purpose: if the volume-filter
 * edge still beats the plain Donchian at a stricter threshold, the edge is robust
 * and not fitted to one threshold value.
 * Same logic as 2310: buy on a 55-day high breakout with volume >= 2.0x the 20-day
 * average; sell on a 30-day low or a hard 30% stop. Full capital.
 * Weakness: same as the family — underperforms buy-and-hold in steady bulls, high
 * drawdown, and a stricter volume bar means fewer (and later) entries.
 */
function onUpdate(ctx) {
  const hi55 = ctx.high(55, 1);
  const lo30 = ctx.low(30, 1);
  const avgVol = ctx.avgVol(20);
  if (hi55 == null || lo30 == null || avgVol == null) return null;

  const px = ctx.price;
  const pos = ctx.position || 0;
  if (px == null) return null;

  if (pos === 0) {
    const vol = ctx.vol;
    if (vol == null) return null;
    // stricter 2.0x threshold for the robustness check
    if (px > hi55 && vol > avgVol * 2.0) {
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
