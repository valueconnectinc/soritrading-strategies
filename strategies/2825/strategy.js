/*
 * @coinsori-strategy v1
 * name: OBV Relaxed Gate + Fear-Greed De-risk 1D
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV relaxed-gate champion is consistent but carries high
 * drawdown (~30-50%) because it stays fully invested at the top of melt-ups and
 * exits late on OBV-turn. Fear & Greed extreme-greed (>80) marks overbought tops.
 * Cutting position size when greed is extreme trims the top of the melt-up, which
 * is exactly where the family's drawdown comes from. This is a SIZING overlay
 * (not an entry signal) — the same fear-greed depth-sizing lever that a validated
 * 4h champion uses, applied to the 1d OBV trend family.
 * When it buys and sells: buys when 30-day OBV is rising, price above the 100-day
 * average, and volume confirms. Position size is cut to 50% when Fear & Greed is
 * extreme greed (>80), and scaled down gently in volatility stress. Exits fully
 * when OBV turns down.
 * When it does NOT work: if Fear & Greed data is missing (returns null) the overlay
 * silently does nothing and the strategy behaves exactly like the champion. In
 * prolonged sideways chop the extreme-greed cut can re-enter slightly late, and it
 * still inherits the family's drawdown in slow grinding bears where greed never
 * spikes.
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

  // Fear & Greed overlay: data may be null (then it does nothing). Extreme greed
  // (>80) marks melt-up tops — cut size to 50% there to reduce the family's
  // high-drawdown weakness. Chosen a priori from the validated 4h champion lever.
  const fg = ctx.data('fg');
  let fgCut = 1.0;
  if (fg != null && Number.isFinite(fg)) {
    if (fg > 80) fgCut = 0.5;
    else if (fg > 70) fgCut = 0.75;
  }

  // GENTLE volatility-target sizing, same as champion.
  const atrPct = atr / price;
  let sizeFrac = 1.0;
  if (atrPct > 0.06) {
    sizeFrac = Math.max(0.5, 1.0 - (atrPct - 0.06) / 0.06);
  }
  sizeFrac *= fgCut;

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
