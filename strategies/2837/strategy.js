/*
 * @coinsori-strategy v1
 * name: OBV Trend Generalization Test BNB/XRP 1D
 * ex: binance
 * syms: BNBUSDT, XRPUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: This is the EXACT champion logic (OBV volume-flow trend,
 * strategy 2820) applied verbatim to two assets the champion was NOT tuned on
 * (BNB, XRP — champion was validated on BTC/ETH/SOL). The purpose is honest
 * cross-asset validation: does the volume-flow trend edge generalize beyond the
 * three majors it was developed on, or is it a BTC-family overfit?
 * When it buys and sells: buys when 30-day OBV is rising AND price is above the
 * 100-day average AND volume confirms. Position size scales down gently in
 * extreme volatility stress (ATR > 6% of price, never below half). Exits fully
 * when OBV turns down.
 * When it does NOT work: the relaxed gate re-enters often after pullbacks, so it
 * whipsaws in range-bound chop, and it inherits the family's high drawdown
 * (MDD ~29-50%) in sharp reversals. If the edge does not generalize, this test
 * tells us the champion is overfit to BTC/ETH/SOL.
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

  if (rising && price > sma100 && volOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
