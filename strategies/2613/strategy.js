/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BTC+ETH 1D (Fed-Gated Wide Exit)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Low-volatility coiling (Bollinger band-width contracting
 * below its own recent average) is followed by a sharp expansion move. Betting
 * on the expansion side of the squeeze, confirmed by a volume surge, captures
 * the start of new directional trends. Running on TWO large-cap majors keeps
 * capital working when one symbol is quiet.
 * When it buys and sells: on each symbol, buys when band-width is below its
 * 20-bar average AND price closes above the upper Bollinger band AND volume
 * > 1.5x its 20-day average AND price is above the 200-day SMA (only trade the
 * long-term bull regime). Exits on a 2.5x-ATR stop or a 20-day low trail; when
 * the fed is easing/neutral (rate not rising) we WIDEN the trail to a 40-day
 * low so we hold through normal pullbacks and capture more of a bull run.
 * When it does NOT work: it deliberately stays out of deep bear markets (price
 * below the 200-day SMA), so it gives up the early bounce of a new bull run
 * that starts below the long average; choppy sideways markets where a squeeze
 * resolves with a failed breakout; and if the fed dataset is unavailable the
 * gate disables and it behaves like the plain 20-day-low version.
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
    // fed easing/neutral -> wider trail; tightening -> tight trail
    const fed = ctx.data('fed_lag30');
    const easing = fed != null && fed <= 5.0; // rate at/below 5% = not tightening
    const stopMult = easing ? 3.5 : 2.5;
    if (price <= ctx.entryPx - atr * stopMult) return { side: 'sell', qty: pos };
    const llN = easing ? 40 : 20;
    const ll = ctx.low(llN, 1);
    if (ll != null && price < ll) return { side: 'sell', qty: pos };
    return null;
  }

  // only enter the long-term bull regime (price above the 200-day average)
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
