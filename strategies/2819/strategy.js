/*
 * @coinsori-strategy v1
 * name: OBV Trend Fast 4H
 * ex: binance
 * syms: BTCUSDT, ETHUSDT, SOLUSDT
 * interval: 4h
 * cash: 10000
 *
 * Why this strategy: The OBV volume-flow trend family is validated on 1d across
 * BTC/ETH/SOL but its weakness is lagging V-shaped melt-ups — the 200-day SMA
 * gate and 30-day OBV lag keep it out of the early rally. On 4h the same signal
 * reacts ~6x faster (200-SMA is ~33 days, 30-period OBV is ~5 days), so it
 * should enter melt-ups earlier while keeping the validated trend edge.
 * When it buys and sells: buys when 30-period OBV is clearly rising AND price is
 * above the 200-period average AND volume confirms. Exits fully when OBV turns
 * down. Position size is scaled down gently in extreme volatility stress.
 * When it does NOT work: 4h has more noise than 1d, so the trend signal fires
 * more often and can whipsaw in choppy range-bound markets where the 1d version
 * stays flat; and it carries the same high-drawdown profile as the 1d family.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const atr = ctx.atr(14, 1);
  if (sma200 == null || atr == null) return null;

  const st = ctx.state;

  // Incremental OBV: keep the running value and a rolling window of the last 31
  // closes so we can read OBV 30 bars back without recomputing the whole series.
  const prevClose = st.ovc;
  const prevObv = st.obv;
  let obv = Number.isFinite(prevObv) ? prevObv : 0; // first bar: start at 0
  if (prevClose != null && Number.isFinite(prevClose)) {
    const c = ctx.closes[ctx.closes.length - 1];
    const v = ctx.volumes[ctx.volumes.length - 1];
    if (Number.isFinite(c) && Number.isFinite(v)) {
      if (c > prevClose) obv += v;
      else if (c < prevClose) obv -= v;
    }
  }
  const win = st.obvWin || [];
  win.push(obv);
  if (win.length > 31) win.shift();
  ctx.state.obvWin = win;
  ctx.state.ovc = ctx.closes[ctx.closes.length - 1];
  ctx.state.obv = obv;

  if (win.length < 31) return null;
  const obvNow = win[win.length - 1];
  const obvPast = win[win.length - 31];
  const rising = obvNow > obvPast * 1.01;
  const falling = obvNow < obvPast * 0.99;

  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

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

  if (rising && price > sma200 && volOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
