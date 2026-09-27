/*
 * @coinsori-strategy v1
 * name: OBV Trend BTC 4H (timeframe test)
 * ex: binance
 * syms: BTCUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The 45d OBV trend recipe is a validated champion on BTC
 * 1d (+205.8%/MDD21.6 recent). This tests whether the same volume-flow trend
 * edge holds on the faster 4h timeframe — a genuinely new axis (timeframe
 * generalization). On 4h, a 60-bar OBV lookback ≈ 10 days and a 200-bar SMA
 * gate ≈ 33 days give a faster trend signal suited to the shorter bars.
 * When it buys and sells: buys when OBV is clearly rising AND price is above
 * the 200-bar average; sells when OBV turns down by 1.5%.
 * When it does NOT work: 4h bars are noisier than daily, so OBV flips more
 * often → more churn and fees; and the edge may simply be daily-specific.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (sma == null || atr == null) return null;

  const LOOKBACK = 60;
  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (!closes || !vols || closes.length < LOOKBACK + 3) return null;

  // Compute OBV over the last LOOKBACK+1 bars (O(n), not O(n^2)).
  const start = closes.length - LOOKBACK - 2;
  let obv = 0;
  const obvSeries = [];
  for (let k = start + 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < LOOKBACK + 1) return null;
  const obvNow = obvSeries[obvSeries.length - 1];
  const obvPast = obvSeries[obvSeries.length - 1 - LOOKBACK];
  const rising = obvNow > obvPast * 1.002;
  const falling = obvNow < obvPast * 0.985;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  const atrPct = atr / price;
  let sizeFrac = 1.0;
  if (atrPct > 0.02) {
    sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.02) / 0.02);
  }

  if (pos > 0) {
    if (falling && cd === 0) {
      ctx.state.cd = 10;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rising && price > sma && cd === 0) {
    ctx.state.cd = 10;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
