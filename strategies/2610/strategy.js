/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BTC+ETH 1D (Chandelier Exit)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same squeeze-breakout edge and the validated 200-SMA
 * defensive gate as the champion, but the EXIT is a chandelier trail (highest
 * high since entry minus 3x ATR) instead of a fixed 20-day low trail. The
 * hypothesis: a 20-day low trail exits winners too early in strong trends,
 * giving up the bull upside the 200-SMA gate already sacrifices. A chandelier
 * trail that rides the ATR-expansion of a real trend should hold winners longer
 * in the bull window while still cutting losers with a hard stop.
 * When it buys and sells: buys on squeeze (band-width below 20-bar avg) + close
 * above the upper Bollinger band + volume > 1.5x 20-day avg, only while price
 * is above the 200-day SMA. Exits when price closes below the highest high
 * since entry minus 3x ATR (chandelier), or on a hard 4x-ATR stop.
 * When it does NOT work: the wider trail means losses are given more room in
 * choppy markets where a squeeze resolves with a failed breakout, so MDD can
 * rise in sideways regimes; it still misses the early bounce of a new bull that
 * starts below the 200-day SMA.
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
  const st = ctx.state;

  if (pos > 0) {
    // track the highest high since entry for the chandelier trail
    if (st.hh == null || price > st.hh) st.hh = price;
    // hard stop: 4x ATR from the peak (generous, gives the trend room)
    if (price <= st.hh - atr * 4) return { side: 'sell', qty: pos };
    // chandelier trail: exit on a close below peak minus 3x ATR
    if (price < st.hh - atr * 3) return { side: 'sell', qty: pos };
    return null;
  }

  // reset peak on a fresh entry
  st.hh = null;

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
