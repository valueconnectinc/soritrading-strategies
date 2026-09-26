/*
 * @coinsori-strategy v1
 * name: Champion + DXY Regime Filter BTC 4H
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: Layers a genuinely different macro axis (the dollar index,
 * DXY) onto the validated champion edge. Crypto panic-bottoms recover strongly
 * when the dollar is weak or stable (supportive liquidity), but a rising dollar
 * is a headwind that turns panic-bottoms into continued crashes. Filtering the
 * bear leg to skip panic buys during a strongly-rising-dollar regime should cut
 * the champion's worst knife-catching losses without sacrificing the recoveries.
 * When it buys and sells: same as the champion — fear-contrarian panic-bottom
 * buys (fear<40 + lower Bollinger break) in the bear leg, trend-pullback buys in
 * the bull leg — but the bear leg is skipped while DXY is rising sharply.
 * When it does NOT work: if the DXY macro series is missing on this venue, the
 * filter silently disables and it degenerates to the plain champion; if DXY
 * regime is noisy at this cadence it may filter out good bottoms too.
 */
function onUpdate(ctx) {
  const bb = ctx.bb(20, 2, 1);
  const ema50 = ctx.ema(50, 1);
  const ema20 = ctx.ema(20, 1);
  const ema20p = ctx.ema(20, 2);
  const atr = ctx.atr(14, 1);
  const fg = ctx.data('fg');
  if (bb == null || bb.lower == null || bb.mid == null) return null;
  if (ema50 == null || ema20 == null || ema20p == null || atr == null) return null;
  if (fg == null) return null;

  // Roll previous-bar DXY on bar change (macro has no ago arg; keep last bar's value).
  const dxyCur = ctx.macro('dxy');
  const st = ctx.state;
  if (st.lastBarI !== ctx.i) {
    st.prevDxy = st.curDxy ?? null;
    st.lastBarI = ctx.i;
  }
  st.curDxy = dxyCur;
  const dxyPrev = st.prevDxy;

  const price = ctx.price;
  const pos = ctx.position;
  const bull = ema20 > ema50 && price > ema50;

  if (pos > 0) {
    if (price <= ctx.entryPx - atr * 3) return { side: 'sell', qty: pos };
    if (!bull) {
      if (price >= bb.mid) return { side: 'sell', qty: pos };
    } else {
      if (price < ema50) return { side: 'sell', qty: pos };
    }
    return null;
  }

  const riskBudget = 0.015;
  const volFrac = riskBudget / (atr / price);
  let qty = (ctx.cash / price) * Math.min(volFrac, 0.99);

  if (bull) {
    const nearEma20 = price <= ema20 + atr * 0.5 && price > ema50;
    const rising = ema20 > ema20p;
    if (nearEma20 && rising) return { side: 'buy', qty: qty };
    return null;
  }

  if (fg < 10) qty = qty * 0.5;
  else if (fg < 20) qty = qty * 0.7;

  // DXY regime gate: skip panic-bottom buys while the dollar is rising sharply
  // (headwind -> likely continued crash). Only applies when DXY data is present.
  if (dxyCur != null && dxyPrev != null && dxyCur > dxyPrev * 1.002) {
    return null;
  }

  if (fg < 40 && price < bb.lower) {
    return { side: 'buy', qty: qty };
  }
  return null;
}
