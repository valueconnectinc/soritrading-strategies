/*
 * @coinsori-strategy v1
 * name: OBV Relaxed Gate + Rising Trend Filter 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV volume-flow trend with a relaxed 100-day bull gate
 * is the validated champion of this family, but its own documented weakness is
 * that the relaxed gate re-enters too eagerly in range-bound chop — it buys when
 * price merely pokes back above a flat or falling 100-day average. This version
 * adds a gentle trend-slope filter: the 100-day average itself must be RISING,
 * not just price above it. In real uptrends the 100-SMA slopes up, so this keeps
 * the melt-up capture; in chop the 100-SMA flattens or falls, so it skips those
 * whipsaw re-entries. Exits are unchanged (the proven OBV-falling exit).
 * When it buys and sells: buys when 30-day OBV is rising, price is above the
 * 100-day average, the 100-day average itself is rising, AND volume confirms.
 * Position is scaled down gently in extreme volatility stress (ATR > 6% of
 * price, never below half). Exits fully when OBV turns down.
 * When it does NOT work: an early melt-up that starts from a still-falling
 * 100-day average (a deep V-recovery off a crash low) is delayed until the
 * average turns up, so it can miss the very first sharp leg; and it still
 * inherits the family's high drawdown (MDD ~29-50%) in sharp reversals.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  const sma100Prev = ctx.sma(100, 21); // 100-SMA ~20 bars ago to measure its slope
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

  // GENTLE volatility-target sizing: full size up to 6% ATR; scale linearly to
  // 50% size at 12% ATR. Only extreme stress cuts exposure, never below half.
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

  // Chop filter: the 100-day average itself must be rising (slope up over ~20
  // bars). In real uptrends it slopes up; in chop it flattens/falls, so this
  // skips the whipsaw re-entries the relaxed gate was prone to.
  const trendUp = sma100 > sma100Prev;

  if (rising && price > sma100 && trendUp && volOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
