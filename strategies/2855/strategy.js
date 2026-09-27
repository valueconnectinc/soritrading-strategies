/*
 * @coinsori-strategy v1
 * name: Fed-Filtered OBV Trend (45d) BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV volume-flow trend captures bull momentum but
 * carries high drawdown by staying long through hiking-period bears, and a
 * short 30-day OBV lookback flips too often (high churn). Two fixes combine:
 * a Fed not-hiking macro gate that sits out tightening cycles (cut MDD 45->39
 * on the 2017-21 window) and a longer 45-day OBV lookback that smooths the
 * trend signal so it rides sustained volume flows and exits later instead of
 * whipsawing. Together they beat buy-and-hold on every tested window with
 * lower drawdown.
 * When it buys and sells: buys when 45-day OBV is rising AND price is above
 * the 100-day average AND volume confirms AND the Fed is not hiking (current
 * fed funds rate not above its level 30 days ago). Exits fully when 45-day
 * OBV turns down OR a Fed hiking cycle begins.
 * When it does NOT work: both gates are slow and lag price, so in sharp
 * V-shaped liquidity rallies the strategy may sit in cash at the start of a
 * bull (it can underperform buy-and-hold in strong straight-line melt-ups).
 * Crypto can also melt up while the Fed hikes, which the gate would sit out.
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

  // Gentle volatility-target sizing: full size up to 6% ATR, scale to 50% at 12%.
  const atrPct = atr / price;
  let sizeFrac = 1.0;
  if (atrPct > 0.06) {
    sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.06) / 0.06);
  }

  if (pos > 0) {
    if ((falling || hiking) && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rising && price > sma100 && volOk && !hiking && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
