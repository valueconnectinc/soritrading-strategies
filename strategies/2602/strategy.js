/*
 * @coinsori-strategy v1
 * name: Bollinger Squeeze Volume Breakout BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Low-volatility coiling (Bollinger band-width contraction
 * to a 100-day minimum) is followed by a sharp expansion move. Betting on the
 * expansion side of the squeeze, confirmed by a volume surge, captures the
 * start of new directional trends.
 * When it buys and sells: buys when band-width hits a 100-day minimum AND
 * price closes above the upper Bollinger band AND volume > 1.5x its average.
 * Exits on a 2.5x-ATR stop or a 20-day low trail.
 * When it does NOT work: choppy sideways markets where a squeeze resolves with
 * a failed breakout; bear markets where the breakout is a bull trap. The
 * volume filter keeps false signals down but cannot eliminate them.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  if (bb == null || atr == null || vol == null || avgVol == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    const ll20 = ctx.low(20, 1);
    if (ll20 != null && price < ll20) return { side: 'sell', qty: pos };
    return null;
  }

  // Squeeze: band width at a 100-day minimum.
  const bw = (bb.upper - bb.lower) / bb.middle;
  let minBw = bw;
  for (let k = 1; k <= 100; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null) break;
    const w = (b.upper - b.lower) / b.middle;
    if (w < minBw) minBw = w;
  }
  if (bw > minBw) return null; // not a fresh squeeze

  // Volume surge + close above upper band = expansion trigger.
  const volSurge = vol > avgVol * 1.5;
  const aboveBand = price > bb.upper;
  if (volSurge && aboveBand) {
    const size = Math.min(0.99, Math.max(0.3, 0.02 / (atr / price)));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
