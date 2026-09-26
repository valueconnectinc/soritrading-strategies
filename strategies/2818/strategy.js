/*
 * @coinsori-strategy v1
 * name: OBV Trend Vol-Scaled Size BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV volume-flow trend family is validated across
 * BTC/ETH/SOL — it captures bull momentum the mean-reversion champion misses,
 * but its weakness is HIGH DRAWDOWN (43-51% MDD) because it stays fully
 * invested through corrections. This version keeps the proven 30-day OBV trend
 * entry but scales position size DOWN only in extreme volatility (ATR% very
 * wide) and trims to half below the 50-day average, so exposure shrinks in
 * stress without giving up normal bull exposure.
 * When it buys and sells: buys when 30-day OBV is clearly rising AND price is
 * above the 200-day average AND volume confirms. Position size is scaled by
 * inverse volatility, but only cuts in extreme stress (ATR > 6% of price).
 * Trims to half below the 50-day average; exits fully when OBV turns down.
 * When it does NOT work: in a steady grinding bull where vol stays low it
 * under-risks slightly; and it still lags the sharpest V-shaped melt-ups.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const sma50 = ctx.sma(50, 1);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || sma50 == null || atr == null) return null;

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
  // 50% size at 12% ATR. (Judgement: crypto 1D range is normally 2-6%; only
  // extreme stress above 6% warrants cutting, and never below half so we keep
  // most of the trend's upside.)
  const atrPct = atr / price;
  let sizeFrac = 1.0;
  if (atrPct > 0.06) {
    sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.06) / 0.06);
  }

  if (pos > 0) {
    // Drawdown-protection trim: if price falls below the 50-day average while
    // holding, cut to half size (keeps some upside, caps the bleed).
    if (price < sma50 && cd === 0) {
      ctx.state.cd = 5;
      const target = ctx.cash * 0.5 / price;
      if (pos > target) return { side: 'sell', qty: pos - target };
    }
    // Full exit when the trend itself turns down.
    if (falling && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rising && price > sma200 && volOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
