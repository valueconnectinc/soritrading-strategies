/*
 * @coinsori-strategy v1
 * name: OBV Trend + Chop Filter Champion 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV volume-flow trend champion (2820) captures bull
 * momentum but whipsaws in range-bound chop — it failed on XRP where prices
 * oscillate. This version adds a trend-coherence (chop) filter: it only enters
 * when the recent move is genuinely directional, not oscillating back and forth.
 * The filter measures how much of the recent price path is "used up" by net
 * direction vs wasted on oscillation. This should cut the XRP-style whipsaw
 * losses while keeping the bull-momentum capture on BTC/ETH/SOL.
 * When it buys and sells: buys when 30-day OBV is rising AND price is above the
 * 100-day average AND volume confirms AND the recent move is directional (low
 * chop). Position is scaled down gently in extreme volatility stress. Exits
 * fully when OBV turns down.
 * When it does NOT work: in a real trend that briefly pauses (the price path
 * oscillates while the direction holds), the chop filter may keep it out of the
 * early re-entry, so it can lag a choppy-but-still-up bull. It inherits the
 * family's high drawdown in sharp reversals.
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
  if (!closes || !vols || closes.length < 40) return null;

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

  // CHOP FILTER: over the last 20 bars, compare the net directional move to the
  // total path length (sum of absolute bar-to-bar changes). A ratio near 1 means
  // the move is almost all directional (trend); a ratio near 0 means the path is
  // wasted on oscillation (chop). Only enter when the move is mostly directional.
  // Threshold 0.45: below this the path is majority oscillation, skip the entry.
  const N = 20;
  const start = closes.length - 1 - N;
  if (start < 0) return null;
  const netMove = Math.abs(closes[closes.length - 1] - closes[start]);
  let pathLen = 0;
  for (let k = start + 1; k < closes.length; k++) {
    pathLen += Math.abs(closes[k] - closes[k - 1]);
  }
  const coherence = pathLen > 0 ? netMove / pathLen : 0;
  const directional = coherence > 0.45;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  // GENTLE volatility-target sizing: full size up to 6% ATR; scale linearly to
  // 50% size at 12% ATR. Only extreme stress cuts exposure, never below half.
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

  if (rising && price > sma100 && volOk && directional && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
