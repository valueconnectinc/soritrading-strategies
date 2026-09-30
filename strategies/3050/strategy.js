/*
 * @coinsori-strategy v1
 * name: BTC 1D Macro-Gated OBV Trend + Keltner MR
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The validated champion's trend leg buys on OBV money-flow
 * confirmation, but it can enter right before a dollar-strength (risk-off) reversal
 * that kills the trend. Adding a MACRO regime filter — the DXY dollar index — is a
 * different family (macro) than the champion's price/volume logic. When DXY is
 * strongly RISING, risk assets like BTC tend to weaken, so this version refuses
 * NEW trend entries until the dollar stops strengthening. The defensive Keltner
 * mean-reversion leg is unchanged (it already only buys extreme capitulation).
 * When it buys and sells: Above the 200-day line it enters on rising 45-day OBV
 * with volume ONLY IF the dollar is not strongly rising (DXY below its own 20-day
 * average), and exits on OBV rollover. Clearly below the 200-day line it buys an
 * extreme flush to the lower Keltner band (EMA20 - 3x ATR) with RSI<30, sized at
 * 1% equity risk, and sells on the snap-back to the mid band.
 * When it does NOT work: If DXY data is unavailable (null) the gate is disabled so
 * it degrades to the plain champion. A persistent dollar rally that BTC ignores
 * could keep it out of a real uptrend. It still lags the very start of melt-ups.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || ema20 == null || atr == null || rsi == null || atr <= 0) return null;

  const uptrendMode = price > sma200;
  const bearMode = price < sma200 * 0.98;

  const LOOKBACK = 45;
  const closes = ctx.closes;
  const vols = ctx.volumes;
  let obvRising = false;
  let obvFalling = false;
  if (closes && vols && closes.length >= LOOKBACK + 2) {
    let obv = 0;
    const obvSeries = [];
    for (let k = 1; k < closes.length; k++) {
      const c = closes[k], p = closes[k - 1], v = vols[k];
      if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
      if (c > p) obv += v;
      else if (c < p) obv -= v;
      obvSeries.push(obv);
    }
    if (obvSeries.length >= LOOKBACK + 1) {
      const obvNow = obvSeries[obvSeries.length - 1];
      const obvPast = obvSeries[obvSeries.length - 1 - LOOKBACK];
      obvRising = obvNow > obvPast * 1.01;
      obvFalling = obvNow < obvPast * 0.985;
    }
  }
  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  // Macro regime: DXY (dollar index) risk filter. Gate = DXY below its own 20-day avg.
  // Build a rolling DXY history in state so we can average it ourselves.
  const st = ctx.state;
  let dollarOk = true;   // default: allow (gate disabled if data missing)
  try {
    const dxy = ctx.macro('dxy');
    if (dxy != null && Number.isFinite(dxy)) {
      if (!Array.isArray(st.dxyHist)) st.dxyHist = [];
      st.dxyHist.push(dxy);
      if (st.dxyHist.length > 20) st.dxyHist.shift();
      if (st.dxyHist.length >= 20) {
        let sum = 0;
        for (let k = 0; k < st.dxyHist.length; k++) sum += st.dxyHist[k];
        const avg = sum / st.dxyHist.length;
        dollarOk = dxy < avg;   // dollar NOT strengthening = risk-on = allow trend entry
      }
    }
  } catch (e) { dollarOk = true; }

  const lower = ema20 - 3.0 * atr;

  if (pos > 0) {
    if (uptrendMode) {
      if (obvFalling) {
        st.cd = ctx.i + 2;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    if (price > ema20) {
      st.cd = ctx.i + 3;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cd != null && ctx.i < st.cd) return null;

  if (uptrendMode) {
    // Trend entry gated by dollar regime: only buy when dollar is not strengthening.
    if (obvRising && volOk && dollarOk) {
      st.cd = null;
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  if (bearMode && price <= lower && rsi < 30) {
    st.cd = null;
    const riskEq = 0.01 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
