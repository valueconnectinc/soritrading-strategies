/*
 * @coinsori-strategy v1
 * name: BTC Hashrate Mild-Scaled Size 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's hash rate (miners' total computing power) is an
 * on-chain fundamental that leads price over long stretches, but it lags in a
 * crash. A 100-day price-trend guard protects the bear. The fixed-size version
 * trails buy-and-hold in a raging bull, but the aggressive trend-scaled version
 * (40-95%) costs too much in the bear. This milder version ramps only 40% to
 * 70% to capture some bull upside while keeping the defensive edge.
 * When it buys and sells: buy when the 30-day smoothed hash rate is higher
 * than 60 days ago AND price is above its 100-day average. Position size grows
 * from 40% to 70% of cash as price climbs from the average to 40% above it.
 * Sell when the hash rate turns down or price closes below the 100-day average.
 * When it does NOT work: a 100-day average is still sensitive, so deep chop
 * can whipsaw it; halving events distort the hash-rate trend; and it still
 * trails buy-and-hold in a raging bull. Requires the hashrate feed online.
 */
function onUpdate(ctx) {
  const hr = ctx.data('hashrate_sma30');
  const sma = ctx.sma(100, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (hr == null || sma == null || closePrev == null) return null;

  const hist = ctx.state.hist || [];
  const prev60 = hist.length >= 60 ? hist[hist.length - 60] : null;
  hist.push(hr);
  if (hist.length > 120) hist.shift();
  ctx.state.hist = hist;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;
  let beenIn = ctx.state.beenIn || false;

  if (pos <= 0) {
    if (prev60 == null) return null;
    const hrRising = hr > prev60 * 1.02;
    const hrMild = hr > prev60 * 1.005;
    const aboveSma = closePrev > sma;
    if (aboveSma && ((beenIn && hrMild) || (!beenIn && hrRising))) {
      // milder ramp: 40% at the trend line up to 70% at +40% above it
      const dist = (closePrev / sma) - 1;
      const frac = Math.min(0.7, Math.max(0.4, 0.4 + dist * 0.75));
      const qty = (cash / price) * frac;
      ctx.state.beenIn = true;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    if ((prev60 != null && hr < prev60 * 0.98) || closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
