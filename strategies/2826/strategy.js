/*
 * @coinsori-strategy v1
 * name: OBV Relaxed Gate + Trend-Line Exit 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV relaxed-gate champion only exits when OBV turns down,
 * which is slow — it gives back large gains in sharp V-reversals (its high-MDD
 * weakness). Adding a trend-line exit (price closing below the 100-day average)
 * catches the same reversals earlier, on a price signal rather than the slower OBV
 * momentum signal. This is a price-only lever, testable without external data, and
 * directly targets the champion's high-drawdown weakness.
 * When it buys and sells: buys when 30-day OBV is rising, price above the 100-day
 * average, and volume confirms. Exits when OBV turns down OR when price closes
 * below the 100-day average (whichever first). Position size scaled down in
 * volatility stress.
 * When it does NOT work: the 100-SMA-cross exit can fire on normal pullbacks that
 * dip below the average mid-trend, cutting winners short in choppy but rising
 * markets — it may trade away return for lower drawdown. In slow grinding bears
 * where price stays below the average it behaves like the champion.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  if (sma100 == null || atr == null) return null;

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

  // GENTLE volatility-target sizing, same as champion.
  const atrPct = atr / price;
  let sizeFrac = 1.0;
  if (atrPct > 0.06) {
    sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.06) / 0.06);
  }

  if (pos > 0) {
    // Trend-line exit: price closing below the 100-day average catches sharp
    // reversals earlier than the OBV-turn signal. Uses closed bar (ago=1).
    const belowTrend = price < sma100;
    if ((falling || belowTrend) && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
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
