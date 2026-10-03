/*
 * @coinsori-strategy v1
 * name: BTC OBV Volume-Flow Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: On-Balance-Volume (OBV) measures whether money is flowing in or
 * out of an asset over time. When OBV is rising while price stays above its long-term
 * 200-day trend, the uptrend is backed by real buying volume — a stronger signal than
 * price alone. This is a different family from price-only mean-reversion.
 * When it buys and sells: buys when OBV has been rising (45-bar) AND price is above
 * the 200-SMA AND yesterday's volume is above its 20-bar average (confirmation);
 * sells when OBV turns down (money flow reverses).
 * When it does NOT work: in choppy range-bound markets OBV whipsaws and the 200-SMA
 * gate keeps it out of most entries; it lags a straight melt-up because it needs the
 * volume confirmation. High drawdown in sharp pullbacks (trend follower, not defensive).
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const closes = ctx.closes;
  const volumes = ctx.volumes;
  if (!closes || !volumes || closes.length < 300) return null;

  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // Compute OBV over the closed history (i=1..n-1) so backtest/live agree.
  const n = closes.length;
  let obv = 0;
  for (let i = 1; i < n; i++) {
    const c = closes[i], pc = closes[i - 1], v = volumes[i];
    if (!Number.isFinite(c) || !Number.isFinite(pc) || !Number.isFinite(v)) continue;
    if (c > pc) obv += v;
    else if (c < pc) obv -= v;
  }

  const pos = ctx.position;

  // Exit: OBV fell over the last 5 closed bars (money flow reversed).
  if (pos > 0) {
    let obv5 = 0;
    const n5 = n - 5;
    for (let i = 1; i < n5; i++) {
      const c = closes[i], pc = closes[i - 1], v = volumes[i];
      if (!Number.isFinite(c) || !Number.isFinite(pc) || !Number.isFinite(v)) continue;
      if (c > pc) obv5 += v;
      else if (c < pc) obv5 -= v;
    }
    if (obv < obv5) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Entry: price above 200-SMA (long-term uptrend).
  if (price <= sma200) return null;

  // OBV rising over 45 bars (money flowing in).
  let obv45 = 0;
  const n45 = n - 45;
  for (let i = 1; i < n45; i++) {
    const c = closes[i], pc = closes[i - 1], v = volumes[i];
    if (!Number.isFinite(c) || !Number.isFinite(pc) || !Number.isFinite(v)) continue;
    if (c > pc) obv45 += v;
    else if (c < pc) obv45 -= v;
  }

  // Volume confirmation: previous bar's volume above its 20-bar average.
  const avgVol = ctx.avgVol(20);
  const volPrev = ctx.volPrev;
  if (!Number.isFinite(avgVol) || avgVol <= 0 || !Number.isFinite(volPrev)) return null;

  if (obv > obv45 && volPrev > avgVol) {
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }
  return null;
}
