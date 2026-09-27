/*
 * @coinsori-strategy v1
 * name: Price-Momentum Trend ROC BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV champion uses volume-flow to detect trend. This
 * tests whether plain PRICE momentum (rate-of-change) does the same job without
 * volume — a genuinely different signal family. If it matches the OBV champion
 * risk-adjusted, volume adds no edge; if it loses, OBV's volume component is
 * what carries the edge.
 * When it buys and sells: buys when the 30-day price ROC is positive AND price
 * is above the 100-day average AND volume confirms; exits fully when the 30-day
 * ROC turns negative.
 * When it does NOT work: same structural high drawdown as all trend-following —
 * it stays invested through sharp reversals and lags strong V-shaped melt-ups.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma100 = ctx.sma(100, 1);
  if (sma100 == null) return null;

  // 30-day price rate of change: current close vs close 30 bars ago.
  const c0 = ctx.closes ? ctx.closes[ctx.closes.length - 1] : null;
  const c30 = ctx.closes ? ctx.closes[ctx.closes.length - 31] : null;
  if (!Number.isFinite(c0) || !Number.isFinite(c30) || c30 <= 0) return null;
  const roc = (c0 - c30) / c30;
  const rising = roc > 0.01;
  const falling = roc < -0.01;

  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    if (falling && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rising && price > sma100 && volOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
