/*
 * @coinsori-strategy v1
 * name: BTC 1D Dual-Mode OBV Trend + Keltner MR
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Two strategies that capture DIFFERENT regimes are combined.
 * OBV volume-flow trend rides accumulation-driven melt-ups, while Keltner
 * mean-reversion buys deep oversold flushes in chop/bear markets. A rising
 * 200-day average picks the mode: uptrend → OBV trend, downtrend/chop → Keltner
 * MR. This captures melt-up upside while staying productive in chop.
 * When it buys and sells: In an uptrend it buys when 45-day OBV is rising with
 * volume confirmation and sells when OBV rolls over. In a downtrend/chop regime
 * it buys a flush to the lower Keltner band (EMA20 - 2.5x ATR) with RSI<40 and
 * sells on the snap-back to the mid band.
 * When it does NOT work: It structurally LAGS straight-line melt-ups because it
 * waits for confirmation, and the mean-reversion leg can catch falling knives in
 * a persistent crash. It is a long-only strategy, not a crash profiteer.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  const sma200 = ctx.sma(200, 1);
  const sma200prev = ctx.sma(200, 2);
  const ema20 = ctx.ema(20, 1);
  const atr = ctx.atr(14, 1);
  const rsi = ctx.rsi(14, 1);
  if (sma200 == null || sma200prev == null || ema20 == null || atr == null || rsi == null || atr <= 0) return null;

  // Regime switch: rising 200-day average = uptrend (OBV trend mode),
  // falling/flat = downtrend/chop (Keltner MR mode).
  const uptrend = sma200 > sma200prev;

  // Build OBV from close direction and volume.
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
  const lower = ema20 - 2.5 * atr;

  if (pos > 0) {
    if (uptrend) {
      // Uptrend mode: exit when OBV rolls over (money flow leaving).
      if (obvFalling) {
        return { side: 'sell', qty: pos };
      }
      return null;
    }
    // Downtrend/chop mode: sell on the snap-back to the mid band.
    if (price > ema20) {
      st.cooldown = ctx.i + 2;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  if (st.cooldown != null && ctx.i < st.cooldown) return null;

  if (uptrend) {
    // Uptrend entry: OBV rising + volume confirmation.
    if (obvRising && volOk) {
      st.cooldown = null;
      return { side: 'buy', qty: (ctx.cash / price) * 0.95 };
    }
    return null;
  }

  // Downtrend/chop entry: Keltner MR — deep flush to the lower band with RSI<40.
  if (price <= lower && rsi < 40) {
    st.cooldown = null;
    // ATR-scaled size: risk 1.5% of equity per trade, capped at 90% of cash.
    const riskEq = 0.015 * ctx.cash;
    const qty = riskEq / atr;
    const maxQty = (ctx.cash / price) * 0.9;
    return { side: 'buy', qty: Math.min(qty, maxQty) };
  }
  return null;
}
