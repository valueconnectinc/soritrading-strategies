/*
 * @coinsori-strategy v1
 * name: 45d OBV Fast Re-Entry BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The champion 45d OBV trend (2858) captures only ~22% of
 * the recent 2023-26 melt-up because after its 1.5% OBV-pullback exit it waits
 * for OBV to rise a full 1% above the 45-day-ago level before re-entering —
 * slow, so it sits in cash through the rebound. This keeps the defensive exit
 * but speeds re-entry: in a strong bull regime (price far above the 100-day
 * average) it re-enters as soon as OBV merely turns up (0.5% rise), instead of
 * waiting for the full 1%.
 * When it buys and sells: buys when 45-day OBV is rising (0.5% in a strong
 * bull, 1% otherwise) AND price is above the 100-day average AND volume
 * confirms. Exits fully when 45-day OBV falls by 1.5% (unchanged from champion).
 * When it does NOT work: fast re-entry can buy back into a real downtrend right
 * before it resumes, adding whipsaw — the risk shows up in choppy bear markets
 * where a brief OBV uptick triggers a premature re-entry.
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
  // strong bull regime: price at least 10% above the 100-day average
  const strongBull = price > sma100 * 1.10;
  // fast re-entry: 0.5% OBV rise in a strong bull, else the standard 1%
  const rising = obvNow > obvPast * (strongBull ? 1.005 : 1.01);
  const falling = obvNow < obvPast * 0.985;

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
    if (falling && cd === 0) {
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
