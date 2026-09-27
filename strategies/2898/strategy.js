/*
 * @coinsori-strategy v1
 * name: Volume-Flow Ratio Trend BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A different volume-flow family from the OBV champion.
 * Instead of a cumulative OBV line, this uses a NORMALIZED volume-flow ratio:
 * the share of volume traded on up-bars minus the share on down-bars over a
 * window. This measures whether recent volume is concentrating on up-moves
 * (accumulation) or down-moves (distribution) — the QUALITY of the flow rather
 * than its running total. A sustained positive ratio with price above the
 * 100-day average signals accumulation-driven uptrend.
 * When it buys and sells: buys when the 20-day volume-flow ratio is clearly
 * positive AND price is above the 100-day average AND volume confirms; sells
 * when the ratio turns clearly negative (distribution) or price breaks below
 * the 200-day average. ATR-scaled size cuts exposure in volatile regimes.
 * When it does NOT work: lags straight-line melt-ups (the 100-day gate keeps it
 * out of early rallies) and churns in choppy sideways markets where the ratio
 * flips sign. Volume-flow trend edges are weakest in low-volume chop.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (sma100 == null || sma200 == null || atr == null) return null;

  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (!closes || !vols || closes.length < 22 || vols.length < 22) return null;

  // Normalized volume-flow ratio over the last 20 CLOSED bars.
  // upVol = volume on up-bars, downVol = volume on down-bars.
  const N = 20;
  let upVol = 0, downVol = 0;
  const start = closes.length - 1 - N; // first closed bar of the window
  for (let k = start; k < closes.length - 1; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) upVol += v;
    else if (c < p) downVol += v;
  }
  const tot = upVol + downVol;
  if (tot <= 0) return null;
  const flowRatio = (upVol - downVol) / tot; // in [-1, 1]

  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  const atrPct = atr / price;
  let sizeFrac = 1.0;
  if (atrPct > 0.06) {
    sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.06) / 0.06);
  }

  if (pos > 0) {
    // Exit on distribution (flow ratio clearly negative) or trend break below 200d
    if ((flowRatio < -0.05 || price < sma200) && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Entry: accumulation (positive flow ratio) + above 100d + volume confirms
  if (flowRatio > 0.05 && price > sma100 && volOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
