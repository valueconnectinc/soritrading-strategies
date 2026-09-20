/*
 * @coinsori-strategy v1
 * name: BTC Hashrate + Fast Trend Guard 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's hash rate (miners' total computing power) is an
 * on-chain fundamental that leads price over long stretches, but it lags in a
 * crash. A 100-day price-trend guard protects the bear while whipsawing less
 * than a 200-day guard in a choppy bull.
 * When it buys and sells: buy when the 30-day smoothed hash rate is higher
 * than 60 days ago AND price is above its 100-day average. Sell when either
 * the hash rate turns down or price closes below the 100-day average. After a
 * whipsaw exit, it re-enters on a faster trigger (price back above the 100-day
 * average with only mildly rising hash rate) so a choppy bull is not missed.
 * When it does NOT work: a 100-day average is still sensitive, so deep chop
 * can whipsaw it; halving events distort the hash-rate trend; it never beats
 * buy-and-hold in a raging bull.
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
  // haveWeBeenIn: set once we have ever held a position, so a later re-entry
  // can use the faster trigger (we are re-joining a known trend, not starting fresh)
  let beenIn = ctx.state.beenIn || false;

  if (pos <= 0) {
    if (prev60 == null) return null;
    const hrRising = hr > prev60 * 1.02;
    const hrMild = hr > prev60 * 1.005;
    const aboveSma = closePrev > sma;
    if (aboveSma && ((beenIn && hrMild) || (!beenIn && hrRising))) {
      const qty = (cash / price) * 0.6;
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
