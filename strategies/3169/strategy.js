/*
 * @coinsori-strategy v1
 * name: BTC Sentiment-Gated OBV Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Combines two independent signal sources. On-Balance Volume
 * (OBV) tracks whether money is flowing in or out, and the Fear & Greed index
 * measures crowd sentiment. When volume flow is rising AND sentiment is not
 * extremely greedy, BTC tends to keep grinding up; extreme greed marks a
 * crowded top where buys are risky.
 * When it buys and sells: Buys when 30-day OBV trend is rising, price is above
 * its 200-day average, and Fear & Greed is below 80 (not extreme greed). Sells
 * when OBV turns down OR Fear & Greed exceeds 88 (panic-top exit).
 * When it does NOT work: In a quiet drift where OBV stays flat, or when Fear &
 * Greed data is missing (then the gate is skipped). Extreme-greed tops can run
 * for weeks, so you may exit early and miss the final melt-up.
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

  // Hysteresis 1.0% to cut whipsaw on flat OBV (learned from the OBV champion).
  const rising = obvNow > obvPast * 1.01;
  const falling = obvNow < obvPast * 0.99;

  // Sentiment gate from the Fear & Greed data feed (0-100).
  // null means the feed is missing -> skip the gate and rely on OBV alone.
  const fg = ctx.data('fg');
  const fgOk = fg != null && Number.isFinite(fg);

  // Cooldown: after a flip, wait 5 bars before flipping again (cuts whipsaw).
  const st = ctx.state;
  let cd = st.cd || 0;
  if (cd > 0) cd--;
  ctx.state.cd = cd;

  if (pos > 0) {
    // Exit on OBV turn-down OR extreme greed (>=88). Extreme greed = crowded top.
    const greedyTop = fgOk && fg >= 88;
    if ((falling || greedyTop) && cd === 0) {
      ctx.state.cd = 5;
      return { side: 'sell', qty: pos };
    }
    return null;
  }
  // Enter only when not at extreme greed (fg < 80). 80 = crowded, risky to buy.
  const notGreedy = !fgOk || fg < 80;
  if (rising && price > sma200 && notGreedy && cd === 0) {
    ctx.state.cd = 5;
    return { side: 'buy', qty: ctx.cash / price * 0.95 };
  }
  return null;
}
