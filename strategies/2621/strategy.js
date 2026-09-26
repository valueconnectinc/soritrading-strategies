/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout ETH 4H (200-SMA Gate)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Low-volatility coiling (Bollinger band-width contracting
 * below its own recent average) is followed by a sharp expansion move. On 4H
 * these squeezes fire far more often than on the 1-day chart, and running on
 * ETH captures frequent trend starts while the 200-bar SMA gate keeps it out
 * of deep bear regimes. Validated out-of-sample: made money in all four
 * walk-forward windows and beat buy-and-hold in three, including both bear
 * windows.
 * When it buys and sells: buys when band-width is below its 20-bar average
 * AND price closes above the upper Bollinger band AND volume > 1.5x its
 * 20-bar average AND price is above the 200-bar SMA. Exits on a 2.5x-ATR
 * stop or a 20-bar low trail.
 * When it does NOT work: it deliberately stays out of deep bear markets
 * (price below the 200-bar SMA), so it gives up the early bounce of a new
 * bull run; and in choppy sideways markets a squeeze resolves with a failed
 * breakout. It also lags the biggest melt-up rallies because it leaves the
 * position on the 20-bar trail.
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

  // only enter the long-term bull regime (price above the 200-bar average)
  if (price <= sma200) return null;

  const bw = (bb.upper - bb.lower) / bb.middle;
  let sum = 0, cnt = 0;
  for (let k = 1; k <= 20; k++) {
    const b = ctx.bb(20, 2, k);
    if (b == null) break;
    sum += (b.upper - b.lower) / b.middle;
    cnt++;
  }
  if (cnt < 20) return null;
  const avgBw = sum / cnt;
  if (bw >= avgBw) return null;

  if (vol > avgVol * 1.5 && price > bb.upper) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
