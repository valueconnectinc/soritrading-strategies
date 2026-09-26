/*
 * @coinsori-strategy v1
 * name: OBV Relaxed Gate + Short Rising Filter 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV relaxed-gate champion re-enters too eagerly in
 * range-bound chop (its documented weakness). A rising-100-SMA filter fixes that
 * but with a 20-bar slope window it also delayed V-recoveries in the recent
 * window. This variant uses a SHORTER 10-bar slope window for the 100-SMA: it
 * still skips flat/falling-trend chop but turns up faster after a deep V-recovery,
 * aiming to keep the bull capture while cutting chop re-entries.
 * When it buys and sells: buys when 30-day OBV is rising, price is above the
 * 100-day average, the 100-day average is rising over the last ~10 bars, AND
 * volume confirms. Position is scaled down gently in extreme volatility stress
 * (ATR > 6% of price, never below half). Exits fully when OBV turns down.
 * When it does NOT work: it can still whipsaw if the 100-SMA oscillates around
 * flat repeatedly, and it inherits the family's high drawdown in sharp reversals.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  const sma100Prev = ctx.sma(100, 11); // 100-SMA ~10 bars ago (shorter slope window)
  const atr = ctx.atr(14, 1);
  if (sma100 == null || sma100Prev == null || atr == null) return null;

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
  const rising = obvNow > obvPast * 1.01;
  const falling = obvNow < obvPast * 0.99;

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
    if (falling && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  const trendUp = sma100 > sma100Prev;

  if (rising && price > sma100 && trendUp && volOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
