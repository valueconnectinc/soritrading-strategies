/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-Mode OBV Trend + Keltner MR (Fast Melt-Up Leg)
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Improvement on the validated champion (2949). The champion's
 * one documented weakness is that its OBV-confirmation trend leg LAGS straight-line
 * melt-ups (W2 captured +56.9 of +266.6 buy-and-hold). This version adds a fast
 * momentum leg: in a strong uptrend (price well above the 200-day line) it buys on
 * a short-EMA cross BEFORE OBV confirms, so it enters melt-ups earlier. The
 * defensive Keltner mean-reversion mode is kept unchanged for bear/chop regimes.
 * When it buys and sells: In a strong uptrend (price > 200-day * 1.08) buy when
 * price closes above the 20-day EMA (fast leg) OR when 45-day OBV rises with volume
 * (slow OBV leg). The fast leg exits when price closes back below the 20-day EMA.
 * In a confirmed downtrend (price < 200-day * 0.98) buy an EXTREME flush to the
 * lower Keltner band (EMA20 - 3x ATR) with RSI<30, sell on the snap-back to mid.
 * When it does NOT work: The fast leg re-enters more often, so it churns more in a
 * choppy-but-above-200d market and pays more fees. It still lags the very first
 * bars of a melt-up (needs to clear the 200-day first) and the MR leg still risks
 * catching a falling knife in a persistent crash. Long-only, not a crash profiteer.
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
  const strongUptrend = price > sma200 * 1.08;   // well above 200-day = melt-up regime
  const bearMode = price < sma200 * 0.98;

  // Build OBV from close direction and volume (same as champion).
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

  const st = ctx.state;
  const lower = ema20 - 3.0 * atr;

  if (pos > 0) {
    if (strongUptrend) {
      // Fast leg: exit when price closes back below the 20-day EMA (momentum lost).
      if (price < ema20) {
        st.cd = ctx.i + 2;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    if (uptrendMode) {
      // Slow OBV leg: exit when money flow rolls over.
      if (obvFalling) {
        st.cd = ctx.i + 2;
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Bear/chop mode: sell on the snap-back to the mid band.
    if (price > ema20) {
      st.cd = ctx.i + 3;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cd != null && ctx.i < st.cd) return null;

  if (strongUptrend) {
    // Fast melt-up entry: price above 20-day EMA (no OBV wait needed).
    if (price > ema20) {
      st.cd = null;
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  if (uptrendMode) {
    // Slow OBV entry (normal uptrend, not yet strong melt-up): OBV + volume.
    if (obvRising && volOk) {
      st.cd = null;
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  // Bear/chop entry: only an EXTREME capitulation flush, clearly below 200-day.
  if (bearMode && price <= lower && rsi < 30) {
    st.cd = null;
    const riskEq = 0.01 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
