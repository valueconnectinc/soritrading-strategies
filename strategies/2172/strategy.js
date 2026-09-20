/*
 * @coinsori-strategy v1
 * name: BTC Hashrate + Trend Guard 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's hash rate (miners' total computing power) is an
 * on-chain fundamental that leads price over long stretches, but it is slow
 * and lags in a crash (miners keep hashing while price falls). Adding a
 * 200-day price-trend guard fixes that: we only hold when both the fundamental
 * (hash rate rising) AND the price trend (above the 200-day average) agree.
 * When it buys and sells: buy when the 30-day smoothed hash rate is higher
 * than 60 days ago AND price is above its 200-day average; sell when either
 * the hash rate turns down or price closes below the 200-day average.
 * When it does NOT work: in a sideways market the 200-day trend whipsaws and
 * it can miss the start of a recovery (it waits for price to reclaim the
 * average); halving events distort the hash-rate trend.
 */
function onUpdate(ctx) {
  const hr = ctx.data('hashrate_sma30');
  const sma = ctx.sma(200, 1);
  const closePrev = ctx.closes[ctx.closes.length - 2];
  if (hr == null || sma == null || closePrev == null) return null;

  // Track the smoothed hash rate 60 bars ago using persistent state.
  const hist = ctx.state.hist || [];
  const prev60 = hist.length >= 60 ? hist[hist.length - 60] : null;
  hist.push(hr);
  if (hist.length > 120) hist.shift();
  ctx.state.hist = hist;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;

  if (pos <= 0) {
    // Buy only when BOTH fundamental and price trend agree.
    if (prev60 != null && hr > prev60 * 1.02 && closePrev > sma) {
      const qty = (cash / price) * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // Exit when either the fundamental or the price trend turns down.
    if ((prev60 != null && hr < prev60 * 0.98) || closePrev < sma) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
