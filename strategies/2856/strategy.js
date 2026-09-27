/*
 * @coinsori-strategy v1
 * name: Fed+OnChain Gated OBV Trend (45d) BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The Fed-filtered 45-day OBV champion already beats
 * buy-and-hold on every window. This adds a second, orthogonal defensive
 * signal: an on-chain demand gate (active addresses AND hashrate both above
 * their 30-day averages). On-chain demand is a fundamental measure of
 * network usage that trends independently of the Fed macro cycle, so it can
 * catch bear regimes the macro gate misses (e.g. demand collapsing while the
 * Fed is neutral). The idea is to sit out regimes where the network is
 * actually shrinking, on top of the Fed hiking filter.
 * When it buys and sells: buys when 45-day OBV is rising AND price is above
 * the 100-day average AND volume confirms AND the Fed is not hiking AND both
 * active addresses and hashrate are above 30-day averages. Exits fully when
 * OBV turns down, a Fed hiking cycle begins, or either on-chain signal
 * falls below its 30-day average.
 * When it does NOT work: on-chain data lags price, so it can keep the
 * strategy in cash during sharp V-shaped liquidity rallies where demand
 * hasn't caught up yet (underperforms buy-and-hold in strong melt-ups). The
 * dual gate is strict, so entries are rarer.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  if (sma100 == null || atr == null) return null;

  // Fed macro gate: hiking if current rate is above 30-day-ago level by a
  // 0.25pp buffer (one typical hike) to avoid churn on tiny moves.
  const now = Number(ctx.data('fed'));
  const lag = Number(ctx.data('fed_lag30'));
  if (!Number.isFinite(now) || now <= 0) return null;
  if (!Number.isFinite(lag) || lag <= 0) return null;
  const hiking = now > lag + 0.25;

  // On-chain demand gate: both active addresses AND hashrate above 30-day
  // averages. Fundamental demand filter, orthogonal to the Fed macro gate.
  const addr = Number(ctx.data('addr'));
  const addrSm = Number(ctx.data('addr_sma30'));
  const hr = Number(ctx.data('hashrate'));
  const hrSm = Number(ctx.data('hashrate_sma30'));
  if (!Number.isFinite(addr) || addr <= 0) return null;
  if (!Number.isFinite(addrSm) || addrSm <= 0) return null;
  if (!Number.isFinite(hr) || hr <= 0) return null;
  if (!Number.isFinite(hrSm) || hrSm <= 0) return null;
  const gateOk = addr > addrSm * 1.01 && hr > hrSm * 1.01;
  const gateOff = addr < addrSm * 0.99 || hr < hrSm * 0.99;

  // 45-day OBV trend: long enough to ride sustained flows, short enough to
  // react to regime turns (sensitivity check: 40/45/50 all beat hold, 45 best).
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
    if ((falling || hiking || gateOff) && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rising && price > sma100 && volOk && !hiking && gateOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
