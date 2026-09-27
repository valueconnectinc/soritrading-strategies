/*
 * @coinsori-strategy v1
 * name: OBV Trend + Drawdown Position Cap BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV trend champion (2820) has high drawdown (~29-50%)
 * because it stays fully invested through sharp reversals. Instead of an exit
 * overlay (all of which failed in the ledger), this variant keeps the exact
 * same buy/sell signals but CUTS POSITION SIZE when the account is in a
 * drawdown from its peak — a persistent exposure reduction that should lower
 * MDD without changing when trades happen.
 * When it buys and sells: same as the champion — buys rising 30-day OBV above
 * the 100-day average with volume, exits on falling OBV. Position size is scaled
 * down both by volatility stress (as the champion does) and by how deep the
 * account is below its all-time high.
 * When it does NOT work: the drawdown cap reduces size exactly when the market
 * is recovering, so it can miss part of the bounce after a crash; and in a
 * normal bull pullback it is already small before the next leg up.
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

  // Drawdown-based position cap: track equity peak, cut size when below it.
  const equity = ctx.cash + pos * price;
  let peak = st.peak != null ? st.peak : equity;
  if (equity > peak) peak = equity;
  ctx.state.peak = peak;
  const ddFromPeak = peak > 0 ? (peak - equity) / peak : 0;
  // Scale linearly from full size at 0% drawdown to 30% size at 25% drawdown.
  let ddFrac = 1.0 - (ddFromPeak / 0.25);
  ddFrac = Math.max(0.3, Math.min(1.0, ddFrac));

  const atrPct = atr / price;
  let sizeFrac = 1.0;
  if (atrPct > 0.06) {
    sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.06) / 0.06);
  }
  sizeFrac = sizeFrac * ddFrac;

  if (pos > 0) {
    if (falling && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (rising && price > sma100 && volOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    if (qty <= 0) return null;
    return { side: 'buy', qty: qty };
  }
  return null;
}
