/*
 * @coinsori-strategy v1
 * name: BTC Hashrate Fundamental Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: Bitcoin's hash rate (miners' total computing power) is an
 * on-chain fundamental. When miners keep adding machines, the network is
 * healthy and price usually follows; when hash rate falls (miner capitulation,
 * often after a halving or a crash), it is a warning sign. This is a slow,
 * fundamental trend signal rather than a price-timing one.
 * When it buys and sells: buy when the 30-day smoothed hash rate is higher
 * than it was 60 days ago (rising miner investment); sell when it falls below
 * that level (miners pulling back). A -25% stop-loss cuts the losses that
 * happen when hash rate lags a falling price.
 * When it does NOT work: hash rate has a long-term upward drift (mining scales
 * over years), so in a deep bear the signal can lag price badly; halving
 * events distort the trend, and the stop-loss can lock in a loss right before
 * a bounce.
 */
function onUpdate(ctx) {
  const hr = ctx.data('hashrate_sma30');
  if (hr == null) return null;

  // Track the smoothed hash rate 60 bars ago using persistent state.
  const hist = ctx.state.hist || [];
  const prev60 = hist.length >= 60 ? hist[hist.length - 60] : null;
  hist.push(hr);
  if (hist.length > 120) hist.shift();
  ctx.state.hist = hist;

  const pos = ctx.position;
  const price = ctx.price;
  const cash = ctx.cash;
  const entry = ctx.entryPx;

  if (pos <= 0) {
    // Buy only when hash rate is clearly rising vs 60 days ago.
    if (prev60 != null && hr > prev60 * 1.02) {
      const qty = (cash / price) * 0.6;
      return { side: 'buy', qty: qty };
    }
    return null;
  } else {
    // Exit when miner investment turns down, or on a -25% hard stop so a
    // slow fundamental signal cannot drag us through a whole bear.
    const pnlPct = entry && entry > 0 ? (price - entry) / entry : 0;
    if ((prev60 != null && hr < prev60 * 0.98) || pnlPct <= -0.25) {
      return { side: 'sell', qty: pos };
    }
    return null;
  }
}
