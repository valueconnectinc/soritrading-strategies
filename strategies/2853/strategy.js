/*
 * @coinsori-strategy v1
 * name: Fed-Filtered OBV Trend BTC 1D v3
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV volume-flow trend family captures bull momentum
 * but carries high drawdown because it stays long through hiking-period bears.
 * The Fed not-hiking regime is a slow macro gate that sits out tightening
 * cycles. v3 keeps the fed-hike exit (it proved to cut whipsaw) and only adds
 * a stronger OBV confirmation plus a longer cooldown to reduce the excess
 * trade count seen in the 2021-26 window.
 * When it buys and sells: buys when 30-day OBV is clearly rising AND price is
 * above the 100-day average AND volume confirms AND the Fed is not hiking.
 * Exits fully when OBV turns down OR a Fed hiking cycle begins.
 * When it does NOT work: crypto can melt up even while the Fed hikes, so the
 * fed gate can sit out strong liquidity-driven rallies. And the fed signal is
 * slow to flip back after a hike ends, so re-entry can be delayed.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  if (sma100 == null || atr == null) return null;

  const now = Number(ctx.data('fed'));
  const lag = Number(ctx.data('fed_lag30'));
  if (!Number.isFinite(now) || now <= 0) return null;
  if (!Number.isFinite(lag) || lag <= 0) return null;
  const hiking = now > lag + 0.25;

  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (!closes || !vols || closes.length < 32) return null;

  let obv = 0;
  const obvSeries = [];
  for (let k = 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < 32) return null;
  const obvNow = obvSeries[obvSeries.length - 1];
  const obvPast = obvSeries[obvSeries.length - 31];
  const rising = obvNow > obvPast * 1.02;
  const falling = obvNow < obvPast * 0.98;

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
    if ((falling || hiking) && cd === 0) {
      ctx.state.cd = 10;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rising && price > sma100 && volOk && !hiking && cd === 0) {
    ctx.state.cd = 10;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
