/*
 * @coinsori-strategy v1
 * name: BTC Hashrate + Trend Guard ATR-Exit 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's hash rate (miners' total computing power) is an
 * on-chain fundamental that leads price over long stretches, but it lags in a
 * crash. A 100-day price-trend guard protects the bear, and an ATR buffer on
 * the exit keeps it from whipsawing out of a choppy bull on shallow dips.
 * When it buys and sells: buy when the 30-day smoothed hash rate is higher
 * than 60 days ago AND price is above its 100-day average. Sell when the hash
 * rate turns down OR price closes more than two ATR below the 100-day average
 * (a shallow dip no longer triggers an exit). After a whipsaw exit it
 * re-enters faster (price back above the 100-day average with only mildly
 * rising hash rate) so a choppy bull is not missed.
 * When it does NOT work: a 100-day average is still sensitive in deep chop;
 * halving events distort the hash-rate trend; it never beats buy-and-hold in
 * a raging bull.
 */
function onUpdate(ctx) {
  const hr = ctx.data('hashrate_sma30');
  const sma = ctx.sma(100, 1);
  const atr = ctx.atr(14, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (hr == null || sma == null || atr == null || closePrev == null) return null;

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
      const qty = (cash / price) * 0.6;
      ctx.state.beenIn = true;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // exit only on a real breakdown: hashrate down, or price closing more
    // than two ATR below the 100-day average (shallow dips are ignored)
    const breakDown = closePrev < sma - 2 * atr;
    if ((prev60 != null && hr < prev60 * 0.98) || breakDown) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
