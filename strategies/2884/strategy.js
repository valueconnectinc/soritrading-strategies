/*
 * @coinsori-strategy v1
 * name: Dual Onchain-Demand + OBV BTC 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Combines two VALIDATED, SAME-DIRECTION BTC 1d signals from
 * different sources — on-chain network demand (30-day smoothed active addresses,
 * a leading fundamental) and price-volume flow (45-day On-Balance Volume, a
 * momentum confirmation). Requiring BOTH to be rising filters out false signals
 * each alone would fire on. Unlike a trend-vs-mean-reversion hybrid (where the
 * two signals fight), here both point the same way, so they should reinforce.
 * When it buys and sells: buys only when smoothed demand is rising AND 45-day
 * OBV is rising; sells when EITHER turns clearly down. Hysteresis + cooldown
 * reduce churn.
 * When it does NOT work: requires both signals up, so it enters later than
 * either alone and can miss the very start of melt-ups; in a choppy market
 * where addresses lag price it can sit out rallies entirely.
 */
function onUpdate(ctx) {
  const pos = ctx.position;
  const price = ctx.price;
  if (!Number.isFinite(price) || price <= 0) return null;

  // --- On-chain demand signal (validated: addr_sma30, 0.5% hysteresis) ---
  const raw = ctx.data('addr_sma30');
  const now = Number(raw);
  if (!Number.isFinite(now) || now <= 0) return null;
  const hist = ctx.state.hist || [];
  hist.push(now);
  if (hist.length > 30) hist.shift();
  ctx.state.hist = hist;
  if (hist.length < 30) return null;
  const past = hist[0];
  const demandRising = now > past * 1.005;
  const demandFalling = now < past * 0.995;

  // --- OBV trend signal (validated: 45d, 1% rise / 1.5% fall) ---
  const LOOKBACK = 45;
  const closes = ctx.closes;
  const vols = ctx.volumes;
  if (!closes || !vols || closes.length < LOOKBACK + 2) return null;
  let obv = 0;
  const obvSeries = [];
  for (let k = 1; k < closes.length; k++) {
    const c = closes[k], p = closes[k - 1], v = vols[k];
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(v)) continue;
    if (c > p) obv += v;
    else if (c < p) obv -= v;
    obvSeries.push(obv);
  }
  if (obvSeries.length < LOOKBACK + 1) return null;
  const obvNow = obvSeries[obvSeries.length - 1];
  const obvPast = obvSeries[obvSeries.length - 1 - LOOKBACK];
  const obvRising = obvNow > obvPast * 1.01;
  const obvFalling = obvNow < obvPast * 0.985;

  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    // Exit if EITHER signal turns down
    if ((demandFalling || obvFalling) && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }

  // Enter only when BOTH signals are rising (same-direction confirmation)
  if (demandRising && obvRising && cd === 0) {
    ctx.state.cd = 5;
    const qty = ctx.cash / price * 0.95;
    return { side: 'buy', qty: qty };
  }
  return null;
}
