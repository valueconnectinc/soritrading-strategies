/*
 * @coinsori-strategy v1
 * name: 45d OBV Partial Scale-Out BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The 45-day OBV champion exits FULLY on an OBV pullback,
 * then re-enters late, so it captures only ~22% of the 2023-26 melt-up. A full
 * trailing stop was tried and failed. Instead of binary full-exit, this scales
 * out to 50% on the first OBV pullback and only exits fully if OBV keeps
 * falling — keeping partial exposure through minor pullbacks so it rides more
 * of a sustained uptrend while still cutting risk on real reversals.
 * When it buys and sells: buys full on rising 45-day OBV above the 100-day
 * average. On a 1.5% OBV drop it sells HALF; on a further 3% drop it sells the
 * rest. Re-buys when OBV turns up again.
 * When it does NOT work: holding a half position through a genuine top means
 * drawdown is higher than the full-exit champion on sharp reversals, and the
 * scale-out adds extra trades (fees).
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  if (sma100 == null || atr == null) return null;

  const LOOKBACK = 45;
  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (!closes || !vols || closes.length < LOOKBACK + 2) return null;

  let obv = 0;
  const obvSeries = [];
  for (let k = 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < LOOKBACK + 1) return null;
  const obvNow = obvSeries[obvSeries.length - 1];
  const obvPast = obvSeries[obvSeries.length - 1 - LOOKBACK];
  const rising = obvNow > obvPast * 1.01;
  // first pullback: 1.5% OBV drop -> sell half; deeper 3% drop -> sell all
  const pullback = obvNow < obvPast * 0.985;
  const deepFall = obvNow < obvPast * 0.97;

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
    // deep fall -> exit fully
    if (deepFall && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    // first pullback -> scale out to half (only if we still hold > half)
    if (pullback && cd === 0 && pos > ctx.position / 2) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos / 2 };
    }
    return null;
  }

  if (rising && price > sma100 && volOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
