/*
 * @coinsori-strategy v1
 * name: BTC Donchian Funding-Filter 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The confirmed Donchian 55-day breakout is a solid BTC trend
 * rider, but its documented weakness is entering a breakout right at a crowded-long
 * top where leverage is stretched and the move reverses. The futures funding rate
 * is the price of leverage: when funding is strongly POSITIVE, longs are paying
 * shorts and the market is over-leveraged long — a poor place to start a long.
 * This variant keeps the proven volume-confirmed Donchian entry but adds a funding
 * regime filter: skip the buy when funding is strongly positive (crowded longs).
 * If funding data is unavailable (null) the filter is skipped so the strategy still
 * trades on the proven breakout edge.
 * When it buys: 55-day high breakout with a strong volume surge, AND funding is not
 * strongly positive (not a crowded-long top).
 * When it sells: close below the 30-day low, or a hard 30% stop below entry.
 * When it does NOT work: same as the plain Donchian — it lags buy-and-hold in a
 * straight parabolic bull, and if funding is stale/absent the filter adds nothing.
 */
function onUpdate(ctx) {
  const hi55 = ctx.high(55, 1);
  const lo30 = ctx.low(30, 1);
  const avgVol = ctx.avgVol(20);
  if (hi55 == null || lo30 == null || avgVol == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position || 0;

  // ---- ENTRY: volume-confirmed 55-day breakout, gated by funding regime ----
  if (pos === 0) {
    const vol = ctx.vol;
    if (vol == null) return null;
    if (px > hi55 && vol > avgVol * 2.0) {
      const f = ctx.funding;
      // Skip if funding is strongly positive = crowded longs at a top.
      // 0.0005 = 0.05% per 8h, a high-leverage regime.
      if (f != null && f > 0.0005) return null;
      ctx.state.peak = px;
      return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
    }
    return null;
  }

  // ---- EXITS ----
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
