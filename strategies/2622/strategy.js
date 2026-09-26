/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout ETH 4H (MACD Momentum Gate)
 * ex: binance
 * syms: ETHUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Same validated squeeze-breakout recipe as the baseline
 * ETH 4H strategy (band-width coiling below its own average, then an
 * expansion breakout above the upper band with volume, gated by the 200-bar
 * SMA). The one change is a MACD bullish-cross momentum confirmation on the
 * entry, meant to filter out failed breakouts that resolve in choppy,
 * range-bound regimes where price pops above the band but momentum has not
 * turned up yet.
 * When it buys and sells: buys only when band-width is below its 20-bar
 * average AND price closes above the upper Bollinger band AND volume > 1.5x
 * its 20-bar average AND price is above the 200-bar SMA AND the MACD line is
 * above its signal line (momentum already turning up). Exits on a 2.5x-ATR
 * stop or a 20-bar low trail (unchanged from baseline).
 * When it does NOT work: it deliberately stays out of deep bear markets
 * (below the 200-bar SMA), so it gives up the early bounce of a new bull
 * run; the extra MACD gate may also skip a few valid breakouts right at the
 * turn where momentum lags price. It lags the biggest melt-up rallies
 * because it leaves the position on the 20-bar trail.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const atr = ctx.atr(14, 1);
  const vol = ctx.vol;
  const avgVol = ctx.avgVol(20);
  const sma200 = ctx.sma(200, 1);
  const macd = ctx.macd(12, 26, 9, 1);
  if (bb == null || atr == null || vol == null || avgVol == null || sma200 == null || macd == null) return null;

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

  // momentum confirmation: MACD line above its signal line filters failed breakouts in chop
  if (macd.macd > macd.signal && vol > avgVol * 1.5 && price > bb.upper) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
