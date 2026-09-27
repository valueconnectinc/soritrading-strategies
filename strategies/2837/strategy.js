/*
 * @coinsori-strategy v1
 * name: OBV Trend + Light Chop Filter 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: A strict chop filter (coherence > 0.45) regressed the OBV
 * trend champion because crypto uptrends naturally contain pullbacks, so the
 * coherence metric reads low even in genuine trends. This version uses a much
 * more lenient threshold (0.22) that only filters the most extreme oscillation —
 * the worst whipsaw — without cutting real trend entries.
 * When it buys and sells: buys when 30-day OBV is rising AND price is above the
 * 100-day average AND volume confirms AND the recent move is not extreme chop.
 * Position scales down gently in high volatility. Exits fully when OBV turns down.
 * When it does NOT work: in a real trend that pauses, even the light filter can
 * delay re-entry, so it may lag a choppy-but-still-up bull. It inherits the
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

  // LIGHT CHOP FILTER: only skip when the path is overwhelmingly oscillation.
  // Threshold 0.22 filters the most extreme whipsaw but lets normal pullback-
  // ridden uptrends through (a strict 0.45 cut too many good entries).
  const N = 20;
  const start = closes.length - 1 - N;
  if (start < 0) return null;
  const netMove = Math.abs(closes[closes.length - 1] - closes[start]);
  let pathLen = 0;
  for (let k = start + 1; k < closes.length; k++) {
    pathLen += Math.abs(closes[k] - closes[k - 1]);
  }
  const coherence = pathLen > 0 ? netMove / pathLen : 0;
  const notExtremeChop = coherence > 0.22;

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

  if (rising && price > sma100 && volOk && notExtremeChop && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
