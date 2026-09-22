/*
 * @coinsori-strategy v1
 * name: LTC Donchian Funding-Filter 4H
 * ex: binance
 * syms: LTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: LTC is a proven defensive asset (band-bounce wins on it), and
 * funding is populated on 4h futures. The funding rate is the price of leverage:
 * strongly positive funding means longs are paying shorts — the market is crowded
 * long and a breakout entry there often reverses. This strategy rides a Donchian
 * breakout trend on LTC 4h but SKIPS the entry when funding is strongly positive,
 * avoiding crowded-long tops. It is a different trend mechanism (fixed-lookback
 * breakout) on a proven asset, gated by a funding regime filter.
 * When it buys: close above the 55-bar high of the prior bars, funding not strongly
 * positive (not a crowded-long top).
 * When it sells: close below the 30-bar low, or a hard 30% stop below entry.
 * When it does NOT work: in a choppy 4h range the Donchian breakout whipsaws; in a
 * strong one-way bull it lags buy-and-hold. If funding is stale it adds little.
 */
function onUpdate(ctx) {
  const hi55 = ctx.high(55, 1);
  const lo30 = ctx.low(30, 1);
  if (hi55 == null || lo30 == null) return null;
  const px = ctx.price;
  if (px == null) return null;

  const pos = ctx.position || 0;

  // ---- ENTRY: 55-bar high breakout, gated by funding regime ----
  if (pos === 0) {
    if (px > hi55) {
      const f = ctx.funding;
      // Skip crowded-long tops (funding > 0.05% per 8h).
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
