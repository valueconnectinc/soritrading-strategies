/*
 * @coinsori-strategy v1
 * name: Squeeze Breakout BTC+ETH 1D (DXY Trend Gate)
 * ex: binance
 * syms: BTCUSDT, ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Same squeeze-breakout edge as the champion, but the
 * defensive gate is a MACRO regime trend instead of a fixed price level. The
 * earlier DXY LEVEL gate (block when dollar > 105) failed because the dollar
 * crossed 105 in both bull and bear regimes. A DXY TREND gate (dollar's 20-day
 * avg above its 60-day avg = risk-off) separates regimes more cleanly and
 * should keep more bull upside than the 200-SMA price gate while still sitting
 * out risk-off bear traps.
 * When it buys and sells: buys on the squeeze+volume+upper-band breakout, but
 * only while the dollar is NOT in a rising regime (20-day DXY avg below 60-day
 * avg). Exits on a 2.5x-ATR stop or a 20-day low trail.
 * When it does NOT work: if crypto decouples from the dollar (BTC rallies on its
 * own while DXY rises) the gate wrongly blocks good breakouts; and in the first
 * bars when there is not yet 60 days of DXY history the gate is disabled.
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

  // accumulate DXY history in state to detect a rising-dollar regime
  const dxy = ctx.macro('dxy');
  const st = ctx.state;
  if (st.lastBarI !== ctx.i) {
    if (st.curDxy != null) {
      if (!st.dxyHist) st.dxyHist = [];
      st.dxyHist.push(st.curDxy);
      if (st.dxyHist.length > 60) st.dxyHist.shift();
    }
    st.lastBarI = ctx.i;
  }
  st.curDxy = dxy;
  const hist = st.dxyHist || [];
  let dxyRising = null;
  if (hist.length >= 60) {
    let s20 = 0, s60 = 0;
    for (let i = 0; i < 20; i++) s20 += hist[hist.length - 1 - i];
    for (let i = 0; i < 60; i++) s60 += hist[hist.length - 1 - i];
    dxyRising = (s20 / 20) > (s60 / 60) * 1.002;
  }
  // no DXY trend signal yet -> stay out rather than guess
  if (dxyRising !== false) return null;

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
