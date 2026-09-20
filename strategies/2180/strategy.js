/*
 * @coinsori-strategy v1
 * name: BTC Hashrate + Fed-Regime Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's hash rate (miners' total computing power) is an
 * on-chain fundamental that leads price over long stretches, and the Fed funds
 * rate direction is a slow macro regime that filters out the worst hiking-cycle
 * bears. Combining the two strongest signals from prior research: hashrate for
 * the fundamental trend, Fed regime for extra bear defense.
 * When it buys and sells: buy when the smoothed hash rate is higher than 60
 * days ago AND the Fed is not in a hiking cycle AND price is above its 100-day
 * average. Sell when the hash rate turns down, the Fed starts hiking, or price
 * closes more than one ATR below the 100-day average (shallow dips ignored).
 * When it does NOT work: a 100-day average is still sensitive in deep chop;
 * halving events distort the hash-rate trend; it never beats buy-and-hold in a
 * raging bull. Requires hashrate and fed data feeds to be online.
 */
function onUpdate(ctx) {
  const hr = ctx.data('hashrate_sma30');
  const fed = ctx.data('fed');
  const sma = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (hr == null || fed == null || sma == null || atr == null || closePrev == null) return null;

  const hist = ctx.state.hist || [];
  const fedHist = ctx.state.fedHist || [];
  const prev60 = hist.length >= 60 ? hist[hist.length - 60] : null;
  hist.push(hr);
  if (hist.length > 120) hist.shift();
  ctx.state.hist = hist;

  fedHist.push(fed);
  if (fedHist.length > 400) fedHist.shift();
  ctx.state.fedHist = fedHist;
  const prev90 = fedHist.length >= 90 ? fedHist[fedHist.length - 90] : null;
  // hiking cycle = Fed funds rate clearly higher than ~90 days ago
  const hiking = prev90 != null && fed > prev90 * 1.01;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;
  let beenIn = ctx.state.beenIn || false;

  if (pos <= 0) {
    if (prev60 == null || prev90 == null) return null;
    const hrRising = hr > prev60 * 1.02;
    const hrMild = hr > prev60 * 1.005;
    const aboveSma = closePrev > sma;
    // require both fundamental (hashrate) and macro (not hiking) to be aligned
    if (aboveSma && !hiking && ((beenIn && hrMild) || (!beenIn && hrRising))) {
      const qty = (cash / price) * 0.6;
      ctx.state.beenIn = true;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    const breakDown = closePrev < sma - atr;
    // exit on any of: hashrate down, Fed hiking, or price breaking the trend
    if ((prev60 != null && hr < prev60 * 0.98) || hiking || breakDown) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
