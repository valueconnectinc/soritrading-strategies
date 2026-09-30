/*
 * @coinsori-strategy v1
 * name: ETH 1D Dual-Mode OBV Trend + Keltner MR
 * ex: binance
 * syms: ETHUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: The dual-mode recipe (OBV volume-flow trend in uptrends +
 * Keltner mean-reversion in bear/chop) is the validated winner on BTC 1D. This
 * applies the EXACT same recipe to ETH with no re-tuning — a clean out-of-sample
 * test of whether the edge generalizes. ETH trends and crashes like BTC but with
 * its own volatility profile, so the regime-switch between the two families
 * should behave similarly.
 * When it buys and sells: Above the 200-day line it rides OBV-confirmed
 * accumulation (buy on rising 45-day OBV with volume, sell on OBV rollover).
 * Clearly below the 200-day line it buys an extreme capitulation flush to the
 * lower Keltner band (EMA20 - 3x ATR) with RSI<30, sized at 1% equity risk, and
 * sells on the snap-back to the mid band.
 * When it does NOT work: ETH can have sharper, deeper crashes than BTC, so the
 * MR leg may catch more falling knives. It still lags straight-line melt-ups
 * because the uptrend leg waits for OBV confirmation.
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

  const st = ctx.state;
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
    if (obvRising && volOk) {
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
