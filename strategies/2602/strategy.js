/*
 * @coinsori-strategy v1
 * name: Multi-Symbol Squeeze Breakout BTC+ETH 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Low-volatility coiling (Bollinger band-width contraction
 * to a 100-day minimum) is followed by a sharp expansion move. Betting on the
 * expansion side of the squeeze, confirmed by a volume surge, captures the
 * start of new directional trends. Running it on TWO large-cap majors (BTC and
 * ETH) means capital is not idle waiting for one symbol to squeeze — when BTC
 * is quiet, ETH often is not, so we capture more of the bull runs while keeping
 * the defensive bear-market profile.
 * When it buys and sells: on each symbol, buys when band-width hits a 100-day
 * minimum AND price closes above the upper Bollinger band AND volume > 1.5x its
 * average. Exits on a 2.5x-ATR stop or a 20-day low trail.
 * When it does NOT work: choppy sideways markets where a squeeze resolves with a
 * failed breakout; bear markets where the breakout is a bull trap. The volume
 * filter keeps false signals down but cannot eliminate them. It also lags very
 * strong straight-line bull runs because it waits for a fresh squeeze.
 */
function onUpdate(ctx) {
  // Trade whichever symbol we are on; apply the same rules to each.
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
    // Risk-size: put more capital in when ATR is tight (less volatile), less when wide.
    const size = Math.min(0.99, Math.max(0.3, 0.02 / (atr / price)));
    return { side: 'buy', qty: ctx.cash / ctx.price * size };
  }
  return null;
}
