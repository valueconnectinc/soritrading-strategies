/*
 * @coinsori-strategy v1
 * name: BTC Donchian Vol-Confirm 3.0x 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Robustness check of the volume-confirmed Donchian 55/30 with an even STRICTER
 * 3.0x volume threshold. Purpose: find the sweet spot and confirm the edge is not
 * overfit to 2.0x. If 3.0x keeps improving (or at least stays strong), the
 * volume-confirmation edge is real; if it collapses, 2.0x was the sweet spot.
 * Same logic as 2310/2312: buy on a 55-day high breakout with volume >= 3.0x the
 * 20-day average; sell on a 30-day low or a hard 30% stop. Full capital.
 * Weakness: a very strict volume bar means very few (and late) entries, so it can
 * miss early moves entirely and underperform buy-and-hold in steady bulls.
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
    if (px > hi55 && vol > avgVol * 3.0) {
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
