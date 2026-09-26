/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BTC+ETH 1D (Tight Squeeze)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same family as the champion (Bollinger band-width
 * contraction -> expansion breakout, gated by the 200-day SMA, exit on 20-day
 * low or 2.5x ATR stop) but with a STRICTER squeeze definition: it only enters
 * when band-width is at its 60-bar minimum, not merely below its 20-bar average.
 * The tighter squeeze is meant to filter out the failed breakouts that happen in
 * choppy sideways markets — only the most coiled setups get entered.
 * When it buys and sells: buys when band-width is the tightest in 60 bars AND
 * price closes above the upper Bollinger band AND volume > 1.5x its 20-day
 * average AND price is above the 200-day SMA. Exits on a 2.5x-ATR stop or a
 * 20-day low trail.
 * When it does NOT work: the stricter squeeze means fewer trades, so it can
 * miss strong straight-line bull runs that never re-coil; and it still stays
 * out of bear markets (price below the 200-day SMA), giving up the early bounce
 * of a new bull that starts below the long average.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const sma200 = ctx.sma(200, 1);
  if (bb == null || atr == null || vol == null || avgVol == null || sma200 == null) return null;

  const price = ctx.price;
  const pos = ctx.position;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 2.5) return { side: 'sell', qty: pos };
    const ll20 = ctx.low(20, 1);
    if (ll20 != null && price < ll20) return { side: 'sell', qty: pos };
    return null;
  }

  // only enter the long-term bull regime (price above the 200-day average)
  if (price <= sma200) return null;

  // Tight squeeze: current band-width is the tightest in the last 60 bars.
  const bw = (bb.upper - bb.lower) / bb.middle;
  let minBw = bw;
  for (let k = 1; k <= 60; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null) break;
    const w = (b.upper - b.lower) / b.middle;
    if (w < minBw) minBw = w;
  }
  if (bw > minBw) return null;

  if (vol > avgVol * 1.5 && price > bb.upper) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
