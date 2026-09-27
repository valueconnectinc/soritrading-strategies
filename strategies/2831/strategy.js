/*
 * @coinsori-strategy v1
 * name: OBV Trend + MR Defense Regime Blend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The OBV trend champion (2820) captures bull momentum but
 * carries high drawdown (~29-50%) because it stays fully invested through sharp
 * reversals. This blend attacks that weakness by switching to a DEFENSIVE
 * mean-reversion mode when price falls below the 200-day average — it stops
 * chasing trends in bear regimes and instead only buys deep panic dips.
 * When it buys and sells: above the 200-day average it follows OBV volume-flow
 * trend (buy rising OBV + volume, exit on falling OBV). Below the 200-day
 * average it switches to band-bounce mean reversion (buy panic dip to the lower
 * Bollinger band with RSI<30, exit at the mid-band or RSI>50).
 * When it does NOT work: in a choppy sideways market that hovers around the
 * 200-day average the two modes can flip back and forth and whipsaw; and in a
 * slow grind-down the MR mode still buys dips that keep falling.
 */
function onUpdate(ctx) {
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const pos = ctx.position;
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  const bull = price > sma200;

  // ---- BEAR regime: defensive band-bounce mean reversion ----
  if (!bull) {
    if (pos > 0) {
      const bb = ctx.bb(20, 2, 1);
      const rsi = ctx.rsi(14, 1);
      const atr = ctx.atr(14, 1);
      if (bb == null || rsi == null || atr == null) return null;
      const mid = bb.mid;
      const entry = ctx.entryPx;
      if (price >= mid || rsi > 50 || (entry != null && price <= entry - 6 * atr)) {
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    const bb = ctx.bb(20, 2, 1);
    const rsi = ctx.rsi(14, 1);
    if (bb == null || rsi == null) return null;
    if (price > bb.lower) return null;
    if (rsi >= 30) return null;
    const lastTrade = ctx.state.lastTradeBar != null ? ctx.state.lastTradeBar : -1e9;
    if (ctx.i - lastTrade < 5) return null;
    ctx.state.lastTradeBar = ctx.i;
    return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
  }

  // ---- BULL regime: OBV volume-flow trend (port from champion 2820) ----
  const atr = ctx.atr(14, 1);
  if (atr == null) return null;
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

  if (rising && volOk && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95 * sizeFrac;
    return { side: 'buy', qty: qty };
  }
  return null;
}
