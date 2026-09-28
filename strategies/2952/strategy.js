/*
 * @coinsori-strategy v1
 * name: BTC 1D OBV Volume-Flow Trend v3
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Sustained rallies in BTC are driven by real accumulation —
 * price rising on above-average volume (money flowing in). OBV tracks that flow.
 * When OBV is climbing AND volume is above its 30-day average, a genuine uptrend
 * is underway and worth riding; when OBV rolls over, the money is leaving.
 * When it buys and sells: Buys when 30-day OBV is rising, price is above the
 * 200-day average (or within 5% below it — a relaxed gate so it catches the
 * early rally), and volume is above its 30-day average. Sells when OBV falls.
 * When it does NOT work: It lags the sharpest V-shaped melt-ups because it waits
 * for OBV confirmation, and it carries meaningful drawdown (23-44%) in choppy
 * trend-less markets where OBV whipsaws. Long-only, so it does not profit from
 * crashes on their own.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // Build OBV from close direction and volume.
  const LOOKBACK = 30;
  const closes = ctx.closes;
  const vols = ctx.volumes;
  let obvRising = false;
  let obvFalling = false;
  if (closes && vols && closes.length >= LOOKBACK + 2) {
    let obv = 0;
    const obvSeries = [];
    for (let k = 1; k < closes.length; k++) {
      const c = closes[k], p = closes[k - 1], v = vols[k];
      if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
      if (c > p) obv += v;
      else if (c < p) obv -= v;
      obvSeries.push(obv);
    }
    if (obvSeries.length >= LOOKBACK + 1) {
      const obvNow = obvSeries[obvSeries.length - 1];
      const obvPast = obvSeries[obvSeries.length - 1 - LOOKBACK];
      // 1% buffer avoids noise flipping the signal daily.
      obvRising = obvNow > obvPast * 1.01;
      obvFalling = obvNow < obvPast * 0.985;
    }
  }
  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  const st = ctx.state;
  if (pos > 0) {
    // Exit when money flow rolls over — the trend is ending.
    if (obvFalling) {
      st.cd = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cd != null && ctx.i < st.cd) return null;

  // Relaxed gate: allow entry within 5% below the 200-SMA to catch early rally.
  const gatePass = price > sma200 * 0.95;
  if (gatePass && obvRising && volOk) {
    st.cd = null;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
