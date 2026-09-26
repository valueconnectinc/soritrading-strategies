/*
 * @coinsori-strategy v1
 * name: OBV Trend Partial Scale-Out 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV volume-flow trend family is validated across
 * BTC/ETH/SOL — it captures bull momentum the mean-reversion champion misses.
 * Its #1 weakness is high drawdown (MDD ~40-51%) because it stays fully invested
 * through pullbacks. Full-exit trailing stops were shown to destroy return via
 * whipsaw, so this version uses a PARTIAL scale-out instead: when price falls a
 * deep amount below its peak since entry, it cuts exposure to half but stays in
 * the trend, so it keeps riding any V-recovery instead of getting whipsawed out.
 * When it buys and sells: buys when 30-day OBV is rising AND price is above the
 * 200-day average AND volume confirms. Exits fully when OBV turns down. While
 * holding, if price drops >35% below its peak since entry it sells half the
 * position (a deep-drawdown shock absorber, not a normal exit).
 * When it does NOT work: in a steady grinding bull with low volatility it
 * under-risks slightly; and it still lags the sharpest V-shaped melt-ups because
 * the 200-SMA gate + 30d OBV lag keep it out of the early rally.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || atr == null) return null;

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
  // 50% size at 12% ATR. Only extreme stress cuts entry size, never below half.
  const atrPct = atr / price;
  let sizeFrac = 1.0;
  if (atrPct > 0.06) {
    sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.06) / 0.06);
  }

  if (pos > 0) {
    // Track peak price since entry to detect deep drawdowns.
    const peak = st.peak || price;
    if (price > peak) ctx.state.peak = price;
    const ddFromPeak = (peak - price) / peak;

    // PARTIAL scale-out: cut to half on a deep drawdown from peak. 35% is far
    // below normal pullbacks (which the trend should ride) but catches crashes.
    // This is a shock absorber, NOT a full exit — keeps the V-recovery upside.
    if (ddFromPeak > 0.35 && pos > 0.5) {
      ctx.state.peak = price; // reset so it re-arms only after a new high
      return { side: 'sell', qty: pos * 0.5 };
    }

    if (falling && cd === 0) {
      ctx.state.cd = 5;
      ctx.state.peak = 0;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rising && price > sma200 && volOk && cd === 0) {
    ctx.state.cd = 5;
    ctx.state.peak = price;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
