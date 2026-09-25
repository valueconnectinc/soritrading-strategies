/*
 * @coinsori-strategy v1
 * name: BTC On-Chain Network-Strength Trend 1D
 * ex: binance
 * syms: BTCUSDT
 * interval: 1d
 * cash: 10000
 *
 * Why this strategy: BTC network fundamentals (active addresses) reflect real
 * adoption. When network participation is GROWING, a sustained price uptrend
 * is more likely to continue. This filters a simple trend-following long
 * through an on-chain health gate — a different axis than pure price momentum.
 * When it buys: it holds long while price is above the 50-day SMA AND active
 * addresses are above their 30-day average (network growing). It exits when
 * price closes back below the 50-day SMA.
 * When it does NOT work: on-chain data is daily and lags — it does not help
 * intraday timing; and in a melt-up where price races ahead while addresses
 * lag (speculation, not adoption), the filter may keep it out of the biggest
 * gains. Also a slow bleed where both price and addresses fall together means
 * it sits in cash through most of a bear market.
 */
function onUpdate(ctx) {
  const sma50 = ctx.sma(50, 1);
  const price = ctx.price;
  const addr = ctx.data('addr');
  if (sma50 == null) return null;
  if (addr == null) return null;

  // Rolling on-chain history to measure NETWORK GROWTH (not just level).
  const st = ctx.state || {};
  const hist = st.addrHist || [];
  hist.push(addr);
  if (hist.length > 30) hist.shift();
  st.addrHist = hist;
  ctx.state = st;

  // network growing = today's addresses above the prior 30-day average
  const prior = hist.slice(0, hist.length - 1);
  const avgPrior = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : null;
  const growing = avgPrior != null && addr > avgPrior;

  const pos = ctx.position;

  if (pos > 0) {
    if (price < sma50) return { side: 'sell', qty: pos };
    return null;
  }

  if (price > sma50 && growing) {
    return { side: 'buy', qty: ctx.cash / ctx.price * 0.99 };
  }
  return null;
}
