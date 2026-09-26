/*
 * @coinsori-strategy v1
 * name: OBV Volume-Flow Trend + Trailing Stop BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Volume flow (OBV) tracks whether money is accumulating or
 * distributing better than price alone. A rising OBV trend with price above its
 * 200-day average confirms an accumulation-driven uptrend. Adding a trailing
 * stop lets winners run during strong melt-ups (where a pure OBV-flip exit
 * exits too early) while still cutting losers on real reversals.
 * When it buys and sells: buys when smoothed OBV is clearly rising vs ~30 days
 * ago AND price is above its 200-day average AND today's volume is above its
 * 30-day average. Sells when price drops 20% from its highest close since entry
 * (trailing stop) OR when OBV turns down. Hysteresis + cooldown reduce churn.
 * When it does NOT work: OBV can diverge from price in choppy sideways markets,
 * causing whipsaw; and the 20% trailing stop lets a fast bear-market crash run
 * to -20% before exiting, which is slower than a tight stop.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // 200-day trend gate: only hold longs in a confirmed bull regime.
  const sma200 = ctx.sma(200, 1);
  if (sma200 == null) return null;

  // Build OBV from volume and close direction.
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

  // Hysteresis: 1.0% to cut churn (validated last cycle).
  const rising = obvNow > obvPast * 1.01;
  const falling = obvNow < obvPast * 0.99;

  // Volume confirmation: only enter when today's volume is above its 30-day
  // average — a rising OBV on quiet volume is a weak drift, not accumulation.
  const avgV = ctx.avgVol(30);
  const volOk = avgV != null && Number.isFinite(avgV) && avgV > 0 && ctx.vol > avgV;

  // Cooldown: after a flip, wait 5 bars before flipping again (cuts whipsaw).
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    // Trailing stop: track highest close since entry; exit if price drops 20%
    // below it. 20% is wide enough to survive normal pullbacks in a melt-up but
    // catches real reversals. Lets winners run in W3-style strong uptrends.
    const peak = st.peak || price;
    if (price > peak) st.peak = price;
    if (price < st.peak * 0.80 && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    // Backup OBV exit: distribution signal even if price hasn't dropped 20%.
    if (falling && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  if (rising && price > sma200 && volOk && cd === 0) {
    ctx.state.cd = 5;
    st.peak = price;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
